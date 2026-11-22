# 0017 Admin exam upload runs in the background (in-process queue)

## Context
Admin exam upload (create / update images) decoded and wrote up to 100 images and ran the DB transaction inside the HTTP request. The admin waited, and a large upload held a request and RAM for a long time.

## Decision
- With `?async=1` on `POST /admin/exams/upload` and `POST /admin/exams/:id/images`, the server runs the cheap checks (names, ans.json, WebP magic bytes, catalog thread, complete exam, AI busy), writes the files to a private temp dir (`<materialTempDir>/exam-uploads/<uploadId>/`, never under the public storage dir), answers 202 and queues the job. Without the flag the old synchronous flow is unchanged.
- One in-process FIFO queue (`utils/upload-queue.ts`, instance in `jobs/exam-upload.queue.ts`), one job at a time. The job runs the same code as the synchronous path inside the thread lock and re-checks every condition there. Staged files are always deleted afterwards.
- Backlog is bounded by `EXAM_UPLOAD_MAX_QUEUED` waiting jobs and `EXAM_UPLOAD_MAX_STAGED_BYTES` on disk (429). The last `EXAM_UPLOAD_JOBS_KEPT` jobs stay in memory for `GET /admin/exam-upload/jobs`; a finished job is pushed to the admin's own socket room as `admin:exam-upload`.

## Consequences
- The queue and the job history live in memory: a restart loses waiting jobs and history (the owner accepted this). Leftover staged files are deleted on start.
- Single PM2 process only; several processes would need a DB-backed job table.
