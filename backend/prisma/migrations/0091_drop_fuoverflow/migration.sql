-- DESTRUCTIVE: drops tables and deletes setting rows. Needs the owner's approval and a DB backup before deploy.
-- Mandatory steps: 1) check `SELECT id, user_id, charged_amount FROM crawl_jobs WHERE status IN ('QUEUED','RUNNING')` returns 0 rows
-- (the worker that finished or refunded those jobs is gone); 2) `pm2 stop fepass-api`; 3) `bash deploy/backup-db.sh`; 4) `bash deploy/deploy.sh`;
-- 5) ship the frontend right after. The old build reads fuo_threads / fuo_source_* and fails on them until PM2 restarts.
-- Rollback: restore the dump, redeploy the previous backend and frontend builds.
-- Exams are no longer imported from the external forum: drop its catalog, source list and run tables.
-- No foreign keys point to these tables; their enum columns are inline MySQL ENUMs and go away with the tables.
-- Kept on purpose: exams (and exams.thread_id), crawl_jobs (guest daily limit, admin history, insights), pe_downloads
-- (purchase history) and the CRAWL_CHARGE / CRAWL_REFUND wallet transaction types (still used when opening an exam, and by existing rows).
DROP TABLE IF EXISTS `fuo_catalog_subjects`;
DROP TABLE IF EXISTS `fuo_catalog_runs`;
DROP TABLE IF EXISTS `fuo_source_runs`;
DROP TABLE IF EXISTS `fuo_source_urls`;
DROP TABLE IF EXISTS `fuo_threads`;

-- Import settings nothing reads any more (forum session cookie, login credentials, request pacing, image quality).
-- `crawler.fetchPrice` (fee to open an exam) is still used and stays.
DELETE FROM `settings` WHERE `key` IN (
  'crawler.cookie', 'crawler.loginEmail', 'crawler.loginPassword', 'crawler.loginLastAt', 'crawler.loginLastError',
  'crawler.userAgent', 'crawler.referer', 'crawler.requestDelayMs', 'crawler.concurrency', 'crawler.webpQuality'
);
