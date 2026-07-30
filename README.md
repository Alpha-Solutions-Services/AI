# Alpha — Staff Jarvis

Personal staff assistant for Alpha Solutions at [ai.alphasolutions.software](https://ai.alphasolutions.software).

## Features

- Staff-only Supabase Auth (`ALPHA_STAFF_EMAILS`)
- Multi-site knowledge crawl + `portal_knowledge` + Sanity ingest
- Groq chat with tool calling across Portal / TMS / Learn Dispatch / ops
- Confirm-before-write for every mutating tool
- Live internet search (`web_search` / `web_fetch`, Tavily or DuckDuckGo)
- Push-to-talk (Web Speech + Groq Whisper) and TTS replies

## Local setup

```bash
cd AI
cp .env.example .env.local
# fill Supabase + GROQ_API_KEY + ALPHA_STAFF_EMAILS
npm install
npm run dev   # http://localhost:3004
```

Run [`supabase/alpha-schema.sql`](supabase/alpha-schema.sql) in the shared Supabase SQL editor.

Add Redirect URL:

`https://ai.alphasolutions.software/auth/callback`  
`http://localhost:3004/auth/callback`

## Deploy

See [DEPLOY.md](DEPLOY.md).
