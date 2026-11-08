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

## Frontend

1. On the local machine run `release.cmd` (builds and produces `release/fepass-web.zip`).
2. The user uploads the zip to the hosting and purges the Cloudflare cache. Claude does not do this.
3. If `seo.subjects.json` should include new subjects, run `npm run export:subjects` in `backend` against a DB that has them, commit the file, then build.

## Data imports (FuOverflow catalog, FLM syllabus)

Follow `tools/HUONG-DAN.md`. Always `--dry-run` first, back up the DB before the real run, delete the temporary file from the VPS afterwards.

## After

Report: what was deployed, migrations applied, anything the user still has to do (upload zip, purge cache, run imports), and what was not verified.
