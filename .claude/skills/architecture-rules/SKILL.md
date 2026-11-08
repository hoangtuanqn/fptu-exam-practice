---
name: architecture-rules
description: Architecture boundaries and design rules for this repo (dependency direction, API compatibility between separately deployed frontend/backend, money flows, AI cost control, caches, file size, decisions). Use when adding a module, endpoint, service, feature folder, or when a change spans layers.
---

# Architecture rules

Complements `fepass-conventions` (how to write code). This file is about boundaries and trade-offs. Use `codegraph_explore` / `codegraph impact <symbol>` to see what a change touches before editing across layers.

## Backend

1. **Dependency direction is one-way:** `routes -> controllers -> services -> repositories -> prisma`. `utils`, `constants`, `rules` are leaves: they never import services or repositories. A service may call another service of the same or a lower-level domain; never create a cycle (check with `codegraph callers`).
2. **Prisma lives in repositories.** Services use repositories; for multi-step writes pass a transaction client (`tx`) into repository methods. New code must not call `prisma.*` from routes, controllers, or (when a repository exists) services.
3. **Routes only wire** middleware + controller. No logic inside the route file.
4. **Money, credits, plan (Pro):** every charge/refund goes through the wallet service in ONE transaction together with the record it pays for. POST endpoints that charge use `idempotent`. Every charging flow has a refund path for failures. Pro/limits are enforced on the server.
5. **AI and external sites cost money or risk bans.** Every AI call: behind the admin switch/config, with a timeout, a token cap and an effort level from `constants/ai.ts`, never blocking the HTTP request when it can run as a background job (see the crawl worker and `exam-solve.service`). Every call to FuOverflow/FLM: throttled, with backoff, cached, and parsed in one isolated module so a layout change is a one-file fix.
6. **In-memory caches** only for read-mostly, non-user-specific data, with a TTL constant and a size bound. The app runs as a single PM2 process, so state is per process and lost on reload: never store anything that must survive in memory.
7. **Limits and numbers are named constants** (`constants/*.ts`) or admin-editable settings, never magic numbers inline. Lists are always bounded (`paginationQuery`, max page size).
8. **Background jobs** (`jobs/`): idempotent, safe to re-run, log counts not personal data, one failing item never stops the batch.

## API compatibility (frontend and backend ship separately)

The backend is deployed first and the frontend zip is uploaded later (and browsers/Cloudflare may cache the old bundle). So:

- API changes are **additive**: add fields/endpoints, do not rename or remove fields or change shapes that the live frontend reads.
- A breaking change is shipped in two steps: backend supports both shapes -> frontend switches -> remove the old shape in a later PR. If a single PR must break compatibility, say so in the PR and tell the user the exact deploy order.
- New frontend code must tolerate missing new fields (old backend during rollout).

## Frontend

1. **Direction: `app -> features -> shared`.** `shared/` never imports from `features/`. (Known exception to fix when touched: `shared/layout` imports the auth context from `features/auth`; the right home is `shared/context`.)
2. **Features talk through small public surfaces** (an exported component or `*.api.ts`), not each other's internals. If two features need the same thing, move it to `shared/` or a neutral feature (like `features/subject`).
3. **Server state** = `useApi` + `QueryBoundary`; URL state = `useUrlState`; UI state = local `useState`. Do not add a global store without a clear need.
4. **Size:** a component file over ~300 lines or a hook mixing unrelated concerns gets split (page composes small components; logic moves into a hook). Known large files (`ExamEditPage`, `PlanPage`, `PracticePage`, `useQuiz`) are split when next modified, not copied as a pattern.
5. **Types:** API types live next to the api file. No `any`, no `@ts-ignore`. Every `eslint-disable` carries a one-line reason.
6. **Gating:** hiding a Pro feature in the UI is cosmetic; the server must enforce it.

## Decisions and growth

- A change that adds a new top-level folder, a new external service, a new background job, or a new pattern gets a short note in `docs/decisions/NNNN-title.md` (context, decision, consequences, 10-20 lines) in the same PR.
- Before adding a dependency (npm package): check that `shared/` or `utils/` cannot already do it, and state why in the PR.
- New pure logic (scoring, scheduling, matching, parsing) is written so it can be unit-tested without the DB or the browser; add tests once the test framework exists.
- Known debt (do not copy, fix when touching): services calling Prisma directly (about half), route files with inline handlers (`catalog`, `check-in`, `plan`, `reminder-public`, `review`, `subject`), no automated tests, no CI.
