---
name: prisma-migration
description: Rules for changing the database schema in this repo (schema.prisma and SQL migrations). Use whenever a table or column is added or changed.
---

# Prisma migrations

Migrations are hand-written SQL files applied by `prisma migrate deploy` (the deploy script runs it automatically). The production database holds real user data and money.

## Rules

1. **Additive only by default.** Add tables, columns (nullable or with a default), indexes. Dropping/renaming a column, changing a type, or any `UPDATE`/`DELETE` of existing rows needs explicit user approval, a backup step, and a note in the PR.
2. **One migration per change**, in its own commit: `backend/prisma/migrations/NNNN_short_name/migration.sql`. `NNNN` = next number after the highest existing folder (check `ls backend/prisma/migrations`). Never edit a migration that is already merged.
3. Keep `schema.prisma` and the SQL in sync (same names, `@map` for snake_case columns, `@@map` for table names).
4. New tables: `DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`, same style as the existing migrations (see `0032_review_notebook`, `0037_fuo_threads`).
5. Write comments inside `schema.prisma` in plain ASCII (no Vietnamese diacritics): the file has had encoding problems.
6. Foreign keys to `users` use `ON DELETE CASCADE` when the data belongs to the user; add the back-relation field on `User`.
7. Add an index for every column set used in `WHERE`/`ORDER BY` of a list endpoint.

## Applying and checking

- Local: stop the backend dev server (it locks the Prisma engine on Windows), then `cd backend && npx prisma migrate deploy && npx prisma generate`.
- To test code that uses the new table without touching the user's local DB, create a throwaway database, apply the SQL there, run the code with `DATABASE_URL` pointing to it, then drop it.
- Production: never run migrations by hand. They run through the deploy script (see `deploy-checklist`), and only when the user asks to deploy.

## In the PR

State the migration number, that it is additive, and that backend must be deployed (and migrate run) before the frontend that needs it.
