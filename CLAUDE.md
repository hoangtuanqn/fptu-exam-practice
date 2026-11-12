# FEPass (practice-fe-fptu)

Web app for FPT University students to practise FE exams: import exams from FuOverflow, AI answers/explanations, scoring, spaced-repetition review, topic reports, Pro plan, credit wallet.

- `backend/`: Express + Prisma (MySQL), PM2 on a VPS. Layers: `routes -> controllers -> services -> repositories -> prisma`, validators in `rules/requests`, shared pieces in `middlewares/`, `utils/`, `constants/`.
- `frontend/`: React + Vite + Tailwind, Material 3 classes (`md-*`). One folder per feature in `src/features/<name>` (pages + `<name>.api.ts`), shared code in `src/shared` (`ui`, `hooks`, `api`, `utils`, `layout`). Alias `@/` = `src/`.
- `tools/`: internal Chrome extensions (FuOverflow catalog, FLM syllabus) + `tools/HUONG-DAN.md`.
- `deploy/`: VPS scripts. `chrome-extension/`: the public extension.

## Rules that always apply

1. Every task = a new branch from an up-to-date `main`, then the smallest possible commits. Follow the `git-workflow` skill. Commit messages and branch names are in English.
2. Never add `Co-Authored-By` or "Generated with Claude" lines to commits or PR bodies.
3. Do not merge a PR, deploy, or touch production (SSH, prod DB) unless the user asks for it in that message.
4. User-facing text (UI, emails, changelog) is Vietnamese. Code, commits, PRs, branch names are English.
5. Never put secrets, IPs, credentials, internal limits or infra details in committed files, changelog or UI text.
6. Before saying a change is done, run the checks in the `verify-changes` skill and report honestly what was and was not verified (the project has no automated tests yet).
7. Reuse before writing: check `frontend/src/shared` and `backend/src/utils|middlewares` first (see `fepass-conventions`).
8. Frontend and backend ship separately: keep API changes additive (see `architecture-rules`).

## Skills in `.claude/skills`

| Skill | Use when |
|---|---|
| `git-workflow` | any change: branch, commit, PR |
| `verify-changes` | before reporting done: type-check, build, how to test backend/frontend |
| `prisma-migration` | schema or migration changes |
| `fepass-conventions` | writing backend/frontend code, folders, shared components, UI copy |
| `sql-performance` | writing or reviewing a repository query, list endpoint or batch job; anything slow (indexes, EXPLAIN, N+1, pagination) |
| `architecture-rules` | new module/endpoint/feature folder, changes across layers, API shape changes, AI/external calls, money flows |
| `marketing-psychology` | designing upsell, pricing, deposit or onboarding prompts. Project rules win over it: only real scarcity, no fake counters, always dismissible, never on exam screens while the timer runs |
| `changelog-entry` | a user-visible feature ships |
| `deploy-checklist` | the user asks to deploy or import data on the VPS |

## Index

CodeGraph is indexed in `.codegraph/` (local, git-ignored). Prefer `codegraph_explore` over grep for "how does X work" questions; run `codegraph sync` after big changes.

## Harness: feature delivery

**Goal:** build tasks that span backend and frontend with separate implementer and reviewer agents.

**Invoke:** when a request touches both `backend/` and `frontend/` (or is large enough to review separately), use the `fepass-feature` skill. Agents live in `.claude/agents` (`backend-engineer`, `frontend-engineer`, `qa-reviewer`). Small single-file fixes and questions are answered directly.

**Change history:**
| Date | Change | Target | Reason |
| --- | --- | --- | --- |
| 2026-11-11 | Initial harness (Harness v2) | all | - |
