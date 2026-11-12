---
name: sql-performance
description: How to write and tune database queries in this repo (MySQL 8 + Prisma): indexes, EXPLAIN, N+1, pagination, batching. Use when writing or reviewing a repository query, a list endpoint, a cron/batch job, or when something is slow.
---

# SQL performance (MySQL 8 + Prisma)

Adapted from the `database-optimization` skill in rohitg00/awesome-claude-code-toolkit (Apache-2.0), keeping only what applies to MySQL and this codebase. The VPS is 1 core / 2 GB, so one bad query hurts every user.

## Measure first

1. Do not call a query "optimized" without evidence. Run `EXPLAIN ANALYZE <query>` (MySQL 8) on a database with realistic row counts and report what you saw (type, key, rows, time). No such database available: say it was not measured.
2. Prisma logs queries as events in `backend/src/configs/prisma.ts`; use that to see the real SQL and to count queries per request.
3. Red flags in the plan: `type: ALL` (full scan) on a table over ~10K rows, `Using filesort` / `Using temporary` on a hot path, `rows` far larger than the result.

## Indexes

- Every `WHERE` / `ORDER BY` of a list endpoint needs an index (also a rule in `prisma-migration`).
- Composite index order: equality columns first, then the range or sort column. `(user_id, created_at)` serves `WHERE user_id = ? ORDER BY created_at DESC`.
- A function or cast on an indexed column in `WHERE` (`DATE(created_at) = ...`, comparing a string column to a number) stops the index being used. Compare the raw column to a range instead.
- A covering index (all selected columns in the index) avoids reading the table row; only worth it for very hot, narrow queries.
- Each index slows writes and uses RAM. Do not add one "just in case"; add it for a query you can name.
- Adding an index to a large live table is a migration: follow `prisma-migration` (additive, own commit).

## Prisma habits

- N+1: a query inside a loop over results is the usual cause. Use `include`/`select`, or one `findMany` with `where: { id: { in: ids } }` and group in memory. More than ~10 queries for one endpoint is a red flag.
- Use `select` for only the needed columns, especially on tables with big text/JSON (exam questions, explanations, material pages, embeddings).
- `count()` over a big filtered set is a scan; do not add a total to every list unless the UI needs it. Use `findFirst` / `exists`-style checks instead of `count() > 0`.
- Batch writes with `createMany` / `updateMany` in chunks of 500-1000 rows; long jobs (nightly similarity, material cleanup) must not hold one huge transaction.
- Keep transactions short: no AI call, file I/O or network call inside `$transaction`.

## Pagination and lists

- Always `take` a bounded page size; never return an unbounded list.
- `skip` (OFFSET) gets slow on deep pages. Fine for admin tables of a few thousand rows; for large or growing tables (wallet transactions, attempts, token usage) use cursor pagination on an indexed, unique-ordered column.

## Dangerous patterns

- `LIKE '%term%'` on a big table: cannot use a B-tree index. Prefix match (`term%`) can; otherwise use a FULLTEXT index or search in the application on a small set.
- `ORDER BY RAND()` on a table: sorts every row. Pick random ids in the app instead.
- `UPDATE` / `DELETE` without a precise `WHERE`: first run the same condition as a `SELECT` and look at the count.
- Counters changed by read-then-write races (balances, quotas): use an atomic `increment` or a transaction with a lock, see `architecture-rules` for money flows.
- Work done on every request that could be cached or computed by the nightly job (the project already precomputes frequency and similarity stats; read those instead of recomputing).

## Connection pool

The pool size is set in `backend/src/configs/prisma.ts` (`connection_limit`). One PM2 instance on a small VPS: keep it small; more connections do not make a 1-core machine faster. Do not raise it to hide slow queries.

## Report

When finishing a query change, say: what query, which index it uses (from EXPLAIN), rows examined, and what was not measured.
