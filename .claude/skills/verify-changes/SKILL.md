---
name: verify-changes
description: How to verify a change in this repo (type-check, build, manual checks) and how to report it honestly. Use before saying any backend or frontend change is done.
---

# Verify changes

There are no automated tests yet, so verification = type-check + build + a targeted manual check. Never claim more than you ran.

## Frontend (`frontend/`)

```
cd frontend
npx tsc --noEmit -p .
npm run build
```

Also look for imports left unused by your edit. For UI changes, say explicitly whether you looked at it in a browser. If you did not, write "type-check and build only, not exercised in a browser".

## Backend (`backend/`)

```
cd backend
npm run prisma:generate   # only if schema.prisma changed
npm run typecheck
```

Gotcha: `prisma generate` fails with EPERM on Windows while the dev server is running (it locks the engine file). Do not kill the user's dev server. Instead generate the client to a temp folder and type-check against it:

1. Copy `schema.prisma` to a temp dir, set `generator client { output = "<temp>/client" }`, run `npx prisma generate --schema <temp>/schema.prisma` with a dummy `DATABASE_URL`.
2. Create a temporary `backend/tsconfig.check.json` that extends `tsconfig.json` and maps `@prisma/client` to `<temp>/client` via `paths`, then `npx tsc -p tsconfig.check.json`.
3. Delete the temporary tsconfig afterwards.

## Testing logic against data

- Never test against the user's real data. For services that read the DB, create a throwaway database (copy only the needed tables from the local demo DB), run the service through `npx tsx`, then drop the database.
- Never run anything against production unless the user explicitly asked in this message.

## Scripts and extensions

- Node scripts: `node --check <file>` and a dry run (`--dry-run`) before any write.
- Chrome extension code that touches the DOM: test the parser in headless Chrome with stubbed HTML/fetch, and say the live site was not tested.

## Reporting

End with: what you ran (commands), what passed, what you could NOT check (browser, live server, real data), and any follow-up the user must do (migrate, deploy, upload).
