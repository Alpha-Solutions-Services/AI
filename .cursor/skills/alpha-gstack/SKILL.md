---
name: alpha-gstack
description: >-
  Use Garry Tan's gstack methodology safely with Alpha Solutions. Apply when
  the user mentions gstack, /office-hours, /review, /cso, /qa, /autoplan, or
  wants YC-style plan/review/QA without risking live Alpha data or deploys.
---

# Alpha-safe gstack

Upstream: https://github.com/garrytan/gstack (MIT). Skills are agent prompts + optional local browser tools — not Alpha product code.

## When to use

- Planning a feature before coding (`/office-hours` → `/autoplan` or CEO/eng plan reviews)
- Pre-merge review (`/review`) or security pass (`/cso`)
- Staging QA (`/qa` on a URL the user gives)
- Scoped debugging (`/investigate` + `/freeze` / `/guard`)

## Alpha overrides (always)

1. Do **not** commit, push, open PRs, or deploy unless the user explicitly asks.
2. Do **not** apply live Supabase migrations or use service role without explicit go.
3. Prefer surgical diffs over gstack “boil the ocean.”
4. Never connect GBrain to Alpha’s shared Supabase or paste Alpha secrets/PATs.
5. Stay inside the app folder/theme for the task (`alpha-shared-stack`).

## Recommended Alpha sprint (safe)

```
Think  → office-hours / plan-ceo-review / plan-eng-review (or autoplan)
Build  → implement in the correct app folder; stop after each slice for review
Review → review + cso (report; fix only with user go on live-sensitive areas)
Test   → qa / qa-only against staging, not production auth cookies by default
Ship   → only when user says commit / push / PR / deploy
```

## Install note (local machine)

Full gstack Cursor install needs Bun +:

```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.cursor/skills/gstack
cd ~/.cursor/skills/gstack && ./setup --host cursor
```

Do **not** run `./setup --team` or `gstack-team-init required` on Alpha live repos unless the user explicitly wants team policy after reviewing the diff.

See workspace rule `alpha-gstack-bridge.mdc`.
