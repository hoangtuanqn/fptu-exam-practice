---
name: deploy-checklist
description: Checklist for deploying the backend/frontend and importing data on the production VPS. Use ONLY when the user explicitly asks to deploy, release, or import data to production.
---

# Deploy checklist

Production holds real users and money. Do nothing here unless the user asked for it in the current message. If a tool call to production is blocked, do not work around it: give the user the exact commands to run themselves.

Connection details (host, user, key) are NOT stored in this repo. They are in the user's SSH setup and `deploy/README.md`.

## Before deploying

1. All PRs for the release are merged into `main` and `main` is pulled locally.
2. `verify-changes` passed for backend and frontend.
3. List new migrations since the last deploy: `ls backend/prisma/migrations` vs what the user says is live. Say whether each is additive.
4. Changelog updated if users will notice (`changelog-entry`).

## Backend

On the VPS, as the app user:

```
cd ~/app && bash deploy/backup-db.sh && bash deploy/deploy.sh
```

`deploy.sh` does: fast-forward `main`, `npm ci`, `prisma generate` + `migrate deploy`, build, PM2 reload. Always back up first. After it finishes, check the health endpoint and PM2 status.

### Destructive migrations (0078, 0079, 0080, 0081 and any later one marked DESTRUCTIVE)

`deploy.sh` migrates while the old build is still serving, and the old build writes the old (INT) ids into tables that are being converted. So for these migrations:

1. Read the migration header and follow its mandatory steps (it lists them; do not skip any).
2. Run `SELECT VERSION(), @@sql_require_primary_key;` (the second value must be 0) and check no crawl or AI job is running.
3. Stop the API first: `pm2 stop fepass-api`, then `bash deploy/backup-db.sh`, then `bash deploy/deploy.sh` (it restarts PM2).
4. Ship the frontend zip right after the backend: the old frontend gets 422 from the new backend until it is replaced.
5. If it fails half-way, do not re-run: restore the dump, follow the rollback notes in the header, redeploy the previous backend and frontend builds.

`0082_fuo_source_urls` is NOT destructive (it only adds two tables), but it must be applied after 0081.
`0084_exam_comments` is NOT destructive (it only adds the `exam_comments` table) and applies after 0083.

## Frontend

1. On the local machine run `release.cmd` (builds and produces `release/fepass-web.zip`).
2. The user uploads the zip to the hosting and purges the Cloudflare cache. Claude does not do this.
3. If `seo.subjects.json` should include new subjects, run `npm run export:subjects` in `backend` against a DB that has them, commit the file, then build.

## Data imports (FuOverflow catalog, FLM syllabus)

Follow `tools/HUONG-DAN.md`. Always `--dry-run` first, back up the DB before the real run, delete the temporary file from the VPS afterwards.

## After

Report: what was deployed, migrations applied, anything the user still has to do (upload zip, purge cache, run imports), and what was not verified.
