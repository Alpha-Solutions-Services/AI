-- Alpha Jarvis schema (shared Supabase project)
-- Run in Supabase SQL editor after reviewing.

create extension if not exists vector;
create extension if not exists pg_trgm;

-- Conversations
create table if not exists public.alpha_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  staff_email text,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists alpha_conversations_user_id_idx
  on public.alpha_conversations (user_id, updated_at desc);

-- Messages
create table if not exists public.alpha_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.alpha_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null default '',
  tool_name text,
  tool_call_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists alpha_messages_conversation_id_idx
  on public.alpha_messages (conversation_id, created_at);

-- Tool audit
create table if not exists public.alpha_tool_runs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.alpha_conversations (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  tool_name text not null,
  args jsonb not null default '{}'::jsonb,
  result jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'executed', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  executed_at timestamptz
);

create index if not exists alpha_tool_runs_user_id_idx
  on public.alpha_tool_runs (user_id, created_at desc);

-- Knowledge documents
create table if not exists public.alpha_documents (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_url text,
  title text,
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  checksum text,
  indexed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (source, source_url)
);

create index if not exists alpha_documents_source_idx
  on public.alpha_documents (source);

-- Knowledge chunks (+ optional embeddings)
-- Default dim 1536 for OpenAI text-embedding-3-small; change if you use another model.
create table if not exists public.alpha_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.alpha_documents (id) on delete cascade,
  chunk_index int not null default 0,
  content text not null,
  token_estimate int,
  embedding vector(1536),
  tsv tsvector generated always as (to_tsvector('english', coalesce(content, ''))) stored,
  created_at timestamptz not null default now()
);

create index if not exists alpha_chunks_document_id_idx
  on public.alpha_chunks (document_id);
create index if not exists alpha_chunks_tsv_idx
  on public.alpha_chunks using gin (tsv);
-- Vector ANN index: create after embeddings exist, e.g.
-- create index alpha_chunks_embedding_idx on public.alpha_chunks
--   using hnsw (embedding vector_cosine_ops);

-- Reuse portal ai_rate_limits if present; else create alpha-specific
create table if not exists public.ai_rate_limits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  count int not null default 0,
  reset_at timestamptz not null default now()
);

create table if not exists public.alpha_ingest_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running',
  sources jsonb not null default '[]'::jsonb,
  docs_upserted int not null default 0,
  chunks_upserted int not null default 0,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- RLS
alter table public.alpha_conversations enable row level security;
alter table public.alpha_messages enable row level security;
alter table public.alpha_tool_runs enable row level security;
alter table public.alpha_documents enable row level security;
alter table public.alpha_chunks enable row level security;
alter table public.alpha_ingest_runs enable row level security;

-- Staff see own conversations (service role bypasses RLS for tools/ingest)
drop policy if exists alpha_conversations_own on public.alpha_conversations;
create policy alpha_conversations_own on public.alpha_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists alpha_messages_own on public.alpha_messages;
create policy alpha_messages_own on public.alpha_messages
  for all using (
    exists (
      select 1 from public.alpha_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.alpha_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

drop policy if exists alpha_tool_runs_own on public.alpha_tool_runs;
create policy alpha_tool_runs_own on public.alpha_tool_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Documents/chunks/ingest: authenticated staff can read; writes via service role
drop policy if exists alpha_documents_read on public.alpha_documents;
create policy alpha_documents_read on public.alpha_documents
  for select to authenticated using (true);

drop policy if exists alpha_chunks_read on public.alpha_chunks;
create policy alpha_chunks_read on public.alpha_chunks
  for select to authenticated using (true);

drop policy if exists alpha_ingest_read on public.alpha_ingest_runs;
create policy alpha_ingest_read on public.alpha_ingest_runs
  for select to authenticated using (true);

-- Hybrid search helper (FTS; vector optional via app-side filter)
create or replace function public.alpha_search_chunks(
  query_text text,
  match_count int default 8
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  source text,
  source_url text,
  title text,
  rank real
)
language sql
stable
as $$
  select
    c.id,
    c.document_id,
    c.content,
    d.source,
    d.source_url,
    d.title,
    ts_rank(c.tsv, websearch_to_tsquery('english', query_text))::real as rank
  from public.alpha_chunks c
  join public.alpha_documents d on d.id = c.document_id
  where c.tsv @@ websearch_to_tsquery('english', query_text)
     or c.content ilike '%' || query_text || '%'
  order by rank desc nulls last
  limit match_count;
$$;

grant execute on function public.alpha_search_chunks(text, int) to authenticated, service_role;

-- Optional vector match (used when OPENAI_API_KEY embeddings are stored)
create or replace function public.alpha_match_chunks(
  query_embedding vector(1536),
  match_count int default 8
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  source text,
  source_url text,
  title text,
  rank real
)
language sql
stable
as $$
  select
    c.id,
    c.document_id,
    c.content,
    d.source,
    d.source_url,
    d.title,
    (1 - (c.embedding <=> query_embedding))::real as rank
  from public.alpha_chunks c
  join public.alpha_documents d on d.id = c.document_id
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.alpha_match_chunks(vector(1536), int) to authenticated, service_role;
