# Skills for Proofly

The agent skills (and reference repos) this project is built with, how to install them in Claude Code, and when each one applies. Install commands come from each repository's README (checked 28 Oct 2026).

**Combined project skill:** `.claude/skills/proofly-engineering/SKILL.md` is committed in this repo, so Claude Code loads it automatically. It merges the rules below with our TDD workflow and locked decisions. The upstream skills give the full detail behind each rule.

Run the commands from the project root: `~/Documents/Payment_Pal`.

## Prerequisites

- Node.js 20+ and npm (for `npx skills` and `npx ui-ux-pro-max-cli`)
- Python 3 (UI UX Pro Max's search script uses it): `python3 --version`
- Claude Code installed and run once in this folder

## 1. NestJS best practices (backend)

Repo: https://github.com/Kadajett/agent-nestjs-skills

```bash
npx skills add Kadajett/agent-nestjs-skills -a claude-code
```

- **Skill:** `nestjs-best-practices` (40 rules: architecture, DI, errors, security, performance, testing, database, API design)
- **Use for:** every backend slice. Most relevant rules here: `arch-feature-modules`, `di-prefer-constructor-injection`, `error-use-exception-filters`, `security-auth-jwt`, `security-validate-all-input`, `security-use-guards`, `test-use-testing-module`, `test-e2e-supertest`, `db-use-migrations`, `devops-use-config-module`.
- **Prompt tip:** "apply nestjs-best-practices (security, testing)".

## 2. Vue skills (frontend)

Repo: https://github.com/vuejs-ai/skills

```bash
npx skills add vuejs-ai/skills -a claude-code
```

Or as a Claude Code plugin, inside Claude Code:

```
/plugin marketplace add vuejs-ai/skills
/plugin install vue-skills-bundle@vue-skills
```

- **Skills:** `vue-best-practices`, `vue-router-best-practices`, `vue-pinia-best-practices`, `vue-testing-best-practices`, `vue-debug-guides`, `create-adaptable-composable`
- **Use for:** every frontend slice.
- **Prompt tip:** the README says to start prompts with **"use vue skill"** so it triggers reliably.

## 3. UI UX Pro Max (design rules and review)

Repo: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill

Inside Claude Code:

```
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill
```

Or with the CLI from the terminal:

```bash
npx ui-ux-pro-max-cli init --ai claude
```

- **Use for:** checking screens against its UX rules (contrast, colour-only status, error summary, empty states, touch targets) and its pre-delivery checklist.
- **Important:** our design is already decided in `design/ui-guide.md`. If the skill suggests a different palette or style, **the guide wins**. Use the skill for review, not to restyle.

## 4. Effective HTML (wireframes, prototypes, diagrams)

Repo: https://github.com/plannotator/effective-html

```bash
npx skills add plannotator/effective-html -a claude-code
```

Or inside Claude Code:

```
/plugin marketplace add plannotator/effective-html
/plugin install plannotator-effective-html@effective-html
```

- **Skills:** `html`, `html-wireframe`, `html-prototype`, `html-plan`, `html-diagram`, `design-artifact`, `big-pics-little-words`
- **Use for:** architecture or flow diagrams for `docs/architecture.md`, and updating `design/wireframes.html` if a screen changes.

## 5. Reference repos (not skills, nothing to install)

| Repo | How we use it |
| --- | --- |
| https://github.com/TailGrids/tailgrids-vue | Markup patterns for cards, tables, forms, modals and badges. **Archived (Feb 2026) and built for Tailwind v3.** Copy the structure and restyle it with our v4 tokens. Don't install `tailgrids` or its plugin. |
| https://github.com/tailwindlabs/tailwindcss | Tailwind CSS v4: tokens live in CSS `@theme` (no `tailwind.config.js`), mobile-first breakpoints. Install with `npm i tailwindcss @tailwindcss/vite`. |

## Check the install

Inside Claude Code, run `/skills` (or ask "which skills do you have?"). You should see `proofly-engineering`, `nestjs-best-practices`, the `vue-*` skills, `ui-ux-pro-max` and the `html-*` skills.

## Which skill for which step

| Step | Skills |
| --- | --- |
| Day 3–4 backend TDD | nestjs-best-practices |
| Day 5–6 frontend | vue skills + ui-ux-pro-max review + `design/ui-guide.md` |
| Day 6 E2E | vue-testing-best-practices (Playwright section) |
| Day 7 docs and diagrams | effective-html (`html-diagram`) |
