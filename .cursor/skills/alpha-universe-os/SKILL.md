---
name: alpha-universe-os
description: >-
  Build and extend Alpha Universe OS in the AI app (/universe): planets,
  BFF modules, CommandBar, voice, and live Supabase data. Use when changing
  Universe UI, planet modules, /api/universe/*, or Alpha staff console
  galaxy shell.
---

# Alpha Universe OS

## Stack lock
- Next **14.2**, React **18**, Tailwind **3** — do not bump to Next 15 / React 19 / TW4
- Legacy JARVIS HUD stays at `/` — Universe is `/universe`

## Architecture
- Planets registry: `AI/src/config/planets.config.ts`
- Shell: `UniverseProvider` → `VoiceBridge` → `UniverseShell`
- Live chrome: `/api/universe/overview` (no fake revenue/metrics)
- Modules must use BFF routes that call `runToolImmediate` (same tools as chat) — **no iframes**
- Writes: confirm-before-write via `/api/tools/confirm`

## Enabled live modules
| Planet | Module | API |
|--------|--------|-----|
| dispatch | `DispatchModule` | `/api/universe/dispatch` → `dispatch_loads` |
| portal | `PortalModule` | `/api/universe/portal` |
| learn-academy | `LearnModule` | `/api/universe/learn` |

## Adding a planet module
1. Create `components/universe/modules/XModule.tsx`
2. Add `/api/universe/x/route.ts` using existing Alpha tools
3. Set `ModuleComponent` + `enabled: true` in `planets.config.ts`
4. Keep Freight Sales disabled until sales tools + env exist

## Voice
- Universe: `VoiceProvider` PTT (`continuous` while held)
- Classic chat: `VoiceDock` Live Talk — pause flush ≥1.6s

## Do not
- Replace `/api/chat` or remove HudShell
- Show mock dollars/loads as live
- Guess TMS table names — prefer `dispatch_loads`
