---
name: alpha-claude-skills
description: >-
  Claude-inspired Agent Skills for Alpha AI. Progressive disclosure of domain
  playbooks (dispatch, portal, academy, org, github, bilingual). Use when
  adding/editing Alpha skills in alpha-skills.config.ts or wiring matchSkills
  into the chat system prompt.
---

# Alpha Claude-style Skills

Inspired by Anthropic Agent Skills:
https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills

## How Alpha implements them
1. **Metadata** always in system prompt (`skillsMetadataBlock`)
2. **Playbooks** load only when `matchSkills(message, planet)` scores a hit
3. **UI** shows skills on Universe via `SkillsPanel`
4. **Constellation** edges in `SKILL_CONSTELLATION` connect related planets

## Files
- `AI/src/config/alpha-skills.config.ts` — registry
- `AI/src/components/universe/SkillsPanel.tsx` — UI
- `AI/src/lib/alpha/system-prompt.ts` — injection
- `AI/src/app/api/chat/route.ts` — matching per turn

## Adding a skill
1. Append to `ALPHA_SKILLS` with id, description, planetIds, tools, playbook
2. Optionally add constellation edges
3. Rebuild — no DB migration needed
