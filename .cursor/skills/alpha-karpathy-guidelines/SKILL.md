---
description: Karpathy-style coding discipline for Alpha AI work — think, simplify, surgical edits, verify with tests.
---

# Karpathy guidelines (Alpha)

Use when writing, reviewing, or refactoring code in this monorepo — especially Alpha AI (`AI/`), Portal, TMS, Freight.

Follow the four principles (same as `.cursor/rules/karpathy-guidelines.mdc`):

1. **Think before coding** — surface assumptions and tradeoffs; ask when unclear.
2. **Simplicity first** — minimum code; no speculative abstractions.
3. **Surgical changes** — touch only what the request requires.
4. **Goal-driven execution** — define verify steps (tests, security checks, typecheck) and loop until they pass.

For Alpha Support / staff APIs: also obey `alpha-api-security` and `alpha-structured-data` rules. Never weaken origin allowlists or open staff tools to anonymous visitors.
