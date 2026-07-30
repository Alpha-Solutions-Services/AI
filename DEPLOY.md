# Deploy Alpha (ai.alphasolutions.software)

## 1. Database

In the shared Supabase project SQL editor, run:

`supabase/alpha-schema.sql`

## 2. Auth redirect URLs

Supabase → Authentication → URL Configuration → Redirect URLs:

- `https://ai.alphasolutions.software/auth/callback`
- `http://localhost:3004/auth/callback`

## 3. Vercel

1. Import GitHub repo `Alpha-Solutions-Services/AI`
2. Framework: Next.js
3. Set env vars from `.env.example` (at minimum: Supabase trio, `GROQ_API_KEY`, `ALPHA_STAFF_EMAILS`, `CRON_SECRET`)
4. Add domain `ai.alphasolutions.software`
5. Point DNS CNAME/A per Vercel instructions

Nightly crawl: `vercel.json` cron hits `/api/cron/crawl` with `Authorization: Bearer $CRON_SECRET` (configure Vercel cron auth header or use the path with Bearer in middleware — this app expects the Authorization header; for Vercel Cron, add a Route Handler that also accepts `?secret=` if needed).

Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is set in the project (ensure the env var name matches).

## 4. First knowledge index

After deploy, sign in as staff → **Knowledge** → **Refresh knowledge now**.

## 5. Optional

- `TAVILY_API_KEY` for higher-quality web search
- `OPENAI_API_KEY` for vector embeddings (FTS works without it)
- Sanity project id + read token for CMS ingest
