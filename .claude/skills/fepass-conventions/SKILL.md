---
name: fepass-conventions
description: Code, folder and UI conventions of this repo (backend layers, frontend features, shared components, page titles, UI principles, Vietnamese copy). Use when writing or reviewing any backend or frontend code.
---

# FEPass conventions

Search for an existing helper before writing a new one (`codegraph_explore`, then `frontend/src/shared`, `backend/src/utils`, `backend/src/middlewares`).

## Backend (`backend/src`)

- Layers: `routes` (wiring only) -> `controllers` (HTTP in/out) -> `services` (business logic) -> `repositories` (Prisma queries). No Prisma in routes or controllers. New code should prefer repositories over calling Prisma directly in services.
- Validation: zod schemas in `rules/requests/*.request.ts`, used with `validate(schema, "body" | "query" | "params")` and read with `getValidated`. Subject codes: `subjectCodeSchema`. Pagination: `paginationQuery` + `toMeta`.
- Responses: `new ResponseClient({ data })`. Errors: `AppError` (`AppError.notFound(...)`), never raw `res.status(...).json` for errors.
- Rate limits: `makeLimiter({ limit, windowMs?, message? })` from `middlewares/rateLimit.middlewares.ts`. Do not call `rateLimit(...)` directly.
- Plan/Pro: `utils/pro.ts` (`isProUser`) and the benefit flags in `constants/plan.ts`. Gate Pro features on the server, not only in the UI.
- Time: Vietnam time helpers in `utils/time.ts` (`vnDate`, `startOfVnDay`).
- Constants and limits live in `constants/*.ts`, not inline.
- Anything charging credit must be one DB transaction (charge + record) and refund on failure.

## Frontend (`frontend/src`)

- One folder per feature: `features/<name>/` with pages, small components and `<name>.api.ts` (uses `http` from `@/shared/api/client`). Shared code only in `shared/` (`ui`, `hooks`, `api`, `utils`, `layout`). Do not import from another feature's internals unless it is its public component/api.
- Data loading: `useApi` + `QueryBoundary` (not hand-written loading/error branches). URL state: `useUrlState`. Search inputs: `useDebounce`. Fuo links: `fuoThreadUrl` / `checkFuoLink`.
- Subject choice: `features/subject` (`SubjectPicker`, `AllSubjectsPicker`, `SubjectCard`). Do not build another picker.
- Styling: Material 3 tokens/classes (`md-*`, `text-on-surface`, `bg-surface-container-*`), shared `Card`, `CardHeader`, `PageHeader`, `Button`/`buttonClass`, `Badge`, `Segmented`, `Empty`. Avoid ad-hoc colours.
- Every new route needs: an entry in `ACCOUNT_NAV`/`ADMIN_NAV` if it is a menu page, and a title + description in `frontend/seo.config.ts` (otherwise the tab shows "Khong tim thay trang").

## UI principles

- One primary action per screen. Show only what the user needs now; put the rest behind a tab, a collapsible, or a link. Do not duplicate what the sidebar or top bar already shows.
- Never silently cut a list. If more items exist, show a count and make the list scrollable or paginated.
- Destructive or paid actions: ask for confirmation, show the amount, and validate before charging.
- Mobile first: check the layout at 390px width; no horizontal scroll.

## Copy and data safety

- UI, email and changelog text: Vietnamese, short, plain words. Code, commits, PRs: English.
- User-facing text must not reveal internal mechanisms, limits, schedules, prices of internal operations, URLs of internal tools, or infrastructure.
- Never commit secrets, IPs, SSH key paths, real user data or exported data files.
