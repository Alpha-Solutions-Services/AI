---
name: alpha-multi-app-integration
description: >-
  Integrate Alpha Solutions products (Portal, TMS, Learn Dispatch, marketing
  site, Sanity, GitHub) into Alpha AI tools and knowledge. Use when adding
  tools, expanding system prompt, querying shared Supabase, or wiring staff
  Q&A across clients, carriers, students, loads, and repos.
---

# Alpha multi-app integration

## Shared Supabase
One project powers Portal + TMS + Learn + AI (`ozuurn…` / env in each app).
Always use service role for staff tools via `getServiceRoleClient()`.

## Product map
| App | Live URL | Folder |
|-----|----------|--------|
| Marketing | www.alphasolutions.software | alpha-solutions / site |
| Freight marketing | afn.alphasolutions.software | Freight |
| Portal | portal.alphasolutions.software | PORTAL |
| TMS | tms.alphasolutions.software | TMS |
| Learn | learndispatch.alphasolutions.software | LEARN-DISPATCH |
| AI | ai.alphasolutions.software | AI |
| Academy | academy.alphasolutions.software | academy |
| GitHub org | github.com/Alpha-Solutions-Services | AI, ALPHA-Portal, TMS, Learn-Dispatch, Alpha-Academy, Freight |

## Tool modules (`AI/src/lib/alpha/tools/`)
- `org.ts` — people, students, carriers, business snapshot
- `portal.ts` — tickets, projects, inquiries, deals
- `tms.ts` — `dispatch_loads` / `tms_loads`
- `learndispatch.ts` — sessions, certificates, student enrollments (profiles)
- `github.ts` — repo catalog (+ optional `GITHUB_TOKEN`)
- `web.ts` — Tavily or DuckDuckGo
- `ops.ts` — notifications (`portal_notifications`), email, knowledge drafts

Register new tools in `registry.ts`. Update `system-prompt.ts` + `company-context.ts`.

## Entity cheatsheet
- People roles on `profiles`: student, carrier, driver, dispatcher, …
- Loads: **`dispatch_loads`** (live ops) not empty `tms_loads`
- Clients: no `clients` table — use profiles + `portal_projects` / inquiries / deals
- CMS: Sanity project in studio package; crawl into `alpha_documents` / chunks

## Rules
- Never invent counts — call `org_business_snapshot` or domain tools
- Write tools require confirm
- Prefer BFF reuse of tools over copying SQL into React
- Optional: set `TAVILY_API_KEY` and `GITHUB_TOKEN` in Vercel for richer live data
