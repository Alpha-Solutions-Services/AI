-- Alpha Support Agent (public marketing chat) — shared Supabase project
-- Separate from alpha_* staff Jarvis tables. Run via migration or SQL editor.

-- ─── Sites (allowlist + onboard mode) ───────────────────────────────────────
create table if not exists public.support_sites (
  slug text primary key,
  display_name text not null,
  allowed_origins text[] not null default '{}',
  onboard_mode text not null default 'tms_carrier'
    check (onboard_mode in ('tms_carrier', 'portal_client', 'none')),
  whatsapp_url text,
  knowledge_tags text[] not null default '{}',
  product text not null default 'marketing',
  is_public boolean not null default true,
  active boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Sessions ───────────────────────────────────────────────────────────────
create table if not exists public.support_sessions (
  id uuid primary key default gen_random_uuid(),
  site_slug text not null references public.support_sites (slug) on delete restrict,
  visitor_token text not null,
  status text not null default 'bot'
    check (status in ('bot', 'queued', 'human', 'closed')),
  page_url text,
  user_agent text,
  ip_hash text,
  lead_name text,
  lead_email text,
  lead_phone text,
  lead_role text,
  lead_intent text,
  assigned_staff_id uuid references auth.users (id) on delete set null,
  assigned_staff_email text,
  last_message_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_sessions_site_status_idx
  on public.support_sessions (site_slug, status, last_message_at desc);
create index if not exists support_sessions_visitor_idx
  on public.support_sessions (visitor_token, site_slug);
create unique index if not exists support_sessions_visitor_open_uidx
  on public.support_sessions (visitor_token, site_slug)
  where status in ('bot', 'queued', 'human');

-- ─── Messages ───────────────────────────────────────────────────────────────
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.support_sessions (id) on delete cascade,
  site_slug text not null,
  role text not null check (role in ('visitor', 'assistant', 'staff', 'system')),
  content text not null default '',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists support_messages_session_idx
  on public.support_messages (session_id, created_at);

-- ─── Leads (normalized, training-ready) ─────────────────────────────────────
create table if not exists public.support_leads (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.support_sessions (id) on delete cascade,
  site_slug text not null references public.support_sites (slug) on delete restrict,
  product text not null default 'marketing',
  name text,
  email text,
  phone text,
  role text,
  intent text,
  onboard_status text not null default 'captured'
    check (onboard_status in ('captured', 'linked', 'completed', 'spam')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id)
);

create index if not exists support_leads_site_idx
  on public.support_leads (site_slug, created_at desc);

-- ─── Rate limits (visitor / IP — not auth.users) ────────────────────────────
create table if not exists public.support_rate_limits (
  rate_key text primary key,
  count int not null default 0,
  reset_at timestamptz not null default now()
);

-- ─── Staff join audit ───────────────────────────────────────────────────────
create table if not exists public.support_staff_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.support_sessions (id) on delete cascade,
  site_slug text not null,
  staff_id uuid references auth.users (id) on delete set null,
  staff_email text,
  event text not null check (event in ('join', 'release', 'close', 'message')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists support_staff_events_session_idx
  on public.support_staff_events (session_id, created_at desc);

-- ─── Seed AFN ───────────────────────────────────────────────────────────────
insert into public.support_sites (
  slug, display_name, allowed_origins, onboard_mode, whatsapp_url, knowledge_tags, product, is_public
) values (
  'afn',
  'Alpha Freight Network',
  array[
    'https://afn.alphasolutions.software',
    'http://localhost:3010',
    'http://127.0.0.1:3010'
  ],
  'tms_carrier',
  'https://wa.me/923494206922',
  array['afn', 'public', 'marketing'],
  'marketing',
  true
)
on conflict (slug) do update set
  display_name = excluded.display_name,
  allowed_origins = excluded.allowed_origins,
  onboard_mode = excluded.onboard_mode,
  whatsapp_url = excluded.whatsapp_url,
  knowledge_tags = excluded.knowledge_tags,
  product = excluded.product,
  is_public = excluded.is_public,
  active = true,
  updated_at = now();

-- ─── RLS: no anon/authenticated direct access — service role only via AI API ─
alter table public.support_sites enable row level security;
alter table public.support_sessions enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_leads enable row level security;
alter table public.support_rate_limits enable row level security;
alter table public.support_staff_events enable row level security;

-- Explicit deny for anon/authenticated (service_role bypasses RLS)
drop policy if exists support_sites_no_direct on public.support_sites;
create policy support_sites_no_direct on public.support_sites
  for all to anon, authenticated using (false) with check (false);

drop policy if exists support_sessions_no_direct on public.support_sessions;
create policy support_sessions_no_direct on public.support_sessions
  for all to anon, authenticated using (false) with check (false);

drop policy if exists support_messages_no_direct on public.support_messages;
create policy support_messages_no_direct on public.support_messages
  for all to anon, authenticated using (false) with check (false);

drop policy if exists support_leads_no_direct on public.support_leads;
create policy support_leads_no_direct on public.support_leads
  for all to anon, authenticated using (false) with check (false);

drop policy if exists support_rate_limits_no_direct on public.support_rate_limits;
create policy support_rate_limits_no_direct on public.support_rate_limits
  for all to anon, authenticated using (false) with check (false);

drop policy if exists support_staff_events_no_direct on public.support_staff_events;
create policy support_staff_events_no_direct on public.support_staff_events
  for all to anon, authenticated using (false) with check (false);

-- Realtime publication (staff UI polls via API; enable if needed later)
-- alter publication supabase_realtime add table public.support_messages;
-- alter publication supabase_realtime add table public.support_sessions;
