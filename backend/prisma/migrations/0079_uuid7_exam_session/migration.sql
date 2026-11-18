-- =====================================================================================================================
-- 0079 uuid7_exam_session  -- DESTRUCTIVE: changes primary/foreign key types and rewrites existing rows. NOT additive.
--
-- Primary keys INT AUTO_INCREMENT -> CHAR(36) UUID v7 (approved by the owner) on: exams, practice_sessions.
-- Foreign key columns repointed to the new exam ids (the tables keep their own INT ids):
--   exam_questions, exam_attachments, crawl_jobs (nullable), user_exams, exam_attempts, practice_sessions, answer_reports,
--   question_explanations, explanation_purchases, explanation_unlocks, review_items, saved_questions, explanation_feedback
-- Soft references (no FK) rewritten: free_explain_turns.used_exam_id, question_group_stats.last_seen_exam_id (values whose
--   exam no longer exists become NULL), admin_notices.link '/admin/exams/<int>' -> '/admin/exams/<uuid>'.
-- Not touched: files on disk (exam images/attachments live under exams/<thread_id>/ and their paths are stored in
--   exam_questions.image_path / exam_attachments.file_path, never built from the exam id); exam_questions.id and every
--   table keyed by it (embeddings, groups, FSRS cards/logs) stay INT.
-- similarity_job_runs.exam_signature is left as is: its format changes in the new code, so the nightly similarity job
--   treats every subject as changed once after deploy (one full, budgeted re-run).
--
-- BEFORE DEPLOY (mandatory):
--   1. Full backup:  mysqldump --single-transaction --routines --triggers <db> > backup_before_0079.sql
--   2. SELECT VERSION(), @@sql_require_primary_key;   -- the second value must be 0
--   3. No crawl job RUNNING and no AI solve/label job in progress (admin > crawl jobs; exams with answer_source PENDING
--      are re-queued by the new build at startup, that is fine):
--        SELECT COUNT(*) FROM crawl_jobs WHERE status = 'RUNNING';   -- must be 0
--   4. Stop the API before migrating (pm2 stop fepass-api): the old build writes INT ids and would fail or race while
--      tables are converted. deploy.sh starts it again after the build.
--   5. Test this file on a copy of the production dump first (same MySQL version).
-- The migration stops by itself before changing anything if an orphan row exists (error 1242 "Subquery returns more
-- than 1 row" from the first DO statement): fix the orphans, run
--   npx prisma migrate resolve --rolled-back 0079_uuid7_exam_session
-- (Prisma records the failed run and refuses to continue with P3009 until then), then deploy again.
-- After ANY restore of the backup taken above, also run: DROP TABLE IF EXISTS _0079_exam_ids, _0079_session_ids;
-- (a dump restore does not remove tables that were created after the dump; step 1 below would fail on them).
--
-- HOW: one mapping table per parent (old INT id as text -> new UUID). Every FK to exams is dropped, then each table
-- has its id/exam_id column converted to CHAR(36) by ONE ALTER (ALGORITHM=COPY, a single rebuild per table; indexes and
-- unique keys keep their names and column order), then one UPDATE ... JOIN rewrites the values. No column is dropped or
-- renamed (MySQL 8.0.29/8.0.30 corrupted data when `id` was dropped and `new_id` renamed in one ALTER).
-- FKs are re-added with FOREIGN_KEY_CHECKS=0 (in place, no extra rebuild); a DO guard checks every value was mapped first.
--
-- Each old row gets a UUID v7 built in SQL from its created_at (ms since epoch, read as stored), version 7, variant 10,
-- then the low 24 bits of the old id (rows of the same millisecond keep their old order and the value is unique without
-- relying on randomness), then 48 random bits. Text order of the new ids = (created_at, old id) order, so ORDER BY id
-- still means creation order (ties inside one millisecond are not strictly ordered for rows created after deploy).
--
-- EXPECTED COST: every listed table is copied once (exam_questions and exam_attempts are the largest) and every row is
-- updated once (one transaction per table: undo log grows with exam_attempts). Writes to each table are blocked while it
-- is copied. Measured on MySQL 8.0.30 (laptop SSD): 2k exams, 100k questions, 50k attempts (~400 MB JSON), 50k sessions,
-- 200k review items, 100k library rows = about 2 minutes. Expect several times longer on a small VPS; check the
-- size of exam_attempts first:  SELECT ROUND((data_length+index_length)/1048576) FROM information_schema.tables
--   WHERE table_schema = DATABASE() AND table_name = 'exam_attempts';
-- Keep the API stopped for the whole run.
--
-- VERIFY (run before and after, counts must be equal):
--   SELECT 'exams', COUNT(*) FROM exams UNION ALL SELECT 'practice_sessions', COUNT(*) FROM practice_sessions
--   UNION ALL SELECT 'exam_questions', COUNT(*) FROM exam_questions UNION ALL SELECT 'exam_attachments', COUNT(*) FROM exam_attachments
--   UNION ALL SELECT 'crawl_jobs with exam', COUNT(exam_id) FROM crawl_jobs UNION ALL SELECT 'user_exams', COUNT(*) FROM user_exams
--   UNION ALL SELECT 'exam_attempts', COUNT(*) FROM exam_attempts UNION ALL SELECT 'answer_reports', COUNT(*) FROM answer_reports
--   UNION ALL SELECT 'question_explanations', COUNT(*) FROM question_explanations UNION ALL SELECT 'explanation_purchases', COUNT(*) FROM explanation_purchases
--   UNION ALL SELECT 'explanation_unlocks', COUNT(*) FROM explanation_unlocks UNION ALL SELECT 'review_items', COUNT(*) FROM review_items
--   UNION ALL SELECT 'saved_questions', COUNT(*) FROM saved_questions UNION ALL SELECT 'explanation_feedback', COUNT(*) FROM explanation_feedback
--   UNION ALL SELECT 'admin_notices exam links', COUNT(*) FROM admin_notices WHERE link LIKE '/admin/exams/%';
-- VERIFY after (every row must be 0):
--   SELECT 'exam_questions', COUNT(*) FROM exam_questions c LEFT JOIN exams e ON e.id = c.exam_id WHERE e.id IS NULL
--   UNION ALL SELECT 'exam_attachments', COUNT(*) FROM exam_attachments c LEFT JOIN exams e ON e.id = c.exam_id WHERE e.id IS NULL
--   UNION ALL SELECT 'crawl_jobs', COUNT(*) FROM crawl_jobs c LEFT JOIN exams e ON e.id = c.exam_id WHERE c.exam_id IS NOT NULL AND e.id IS NULL
--   UNION ALL SELECT 'user_exams', COUNT(*) FROM user_exams c LEFT JOIN exams e ON e.id = c.exam_id WHERE e.id IS NULL
--   UNION ALL SELECT 'exam_attempts', COUNT(*) FROM exam_attempts c LEFT JOIN exams e ON e.id = c.exam_id WHERE e.id IS NULL
--   UNION ALL SELECT 'practice_sessions', COUNT(*) FROM practice_sessions c LEFT JOIN exams e ON e.id = c.exam_id WHERE e.id IS NULL
--   UNION ALL SELECT 'answer_reports', COUNT(*) FROM answer_reports c LEFT JOIN exams e ON e.id = c.exam_id WHERE e.id IS NULL
--   UNION ALL SELECT 'question_explanations', COUNT(*) FROM question_explanations c LEFT JOIN exams e ON e.id = c.exam_id WHERE e.id IS NULL
--   UNION ALL SELECT 'explanation_purchases', COUNT(*) FROM explanation_purchases c LEFT JOIN exams e ON e.id = c.exam_id WHERE e.id IS NULL
--   UNION ALL SELECT 'explanation_unlocks', COUNT(*) FROM explanation_unlocks c LEFT JOIN exams e ON e.id = c.exam_id WHERE e.id IS NULL
--   UNION ALL SELECT 'review_items', COUNT(*) FROM review_items c LEFT JOIN exams e ON e.id = c.exam_id WHERE e.id IS NULL
--   UNION ALL SELECT 'saved_questions', COUNT(*) FROM saved_questions c LEFT JOIN exams e ON e.id = c.exam_id WHERE e.id IS NULL
--   UNION ALL SELECT 'explanation_feedback', COUNT(*) FROM explanation_feedback c LEFT JOIN exams e ON e.id = c.exam_id WHERE e.id IS NULL
--   UNION ALL SELECT 'non-uuid exam ids', COUNT(*) FROM exams WHERE CHAR_LENGTH(id) <> 36
--   UNION ALL SELECT 'non-uuid session ids', COUNT(*) FROM practice_sessions WHERE CHAR_LENGTH(id) <> 36;
--
-- ROLLBACK: there is no down migration. Restore the mysqldump taken above (it also restores `_prisma_migrations`
-- without this migration) and redeploy the previous backend AND frontend builds (the new frontend expects string ids).
-- MySQL DDL is not transactional: if this migration fails half-way, do NOT re-run it on top of the partial state;
-- restore the backup, fix, then deploy again.
-- =====================================================================================================================

-- ---------------------------------------------------------------------------------------------------------------------
-- 0. Guard, before any change: no orphan row may exist (each branch returns a row only on a problem; any extra row makes
--    the scalar subquery fail with error 1242 and the migration stops untouched). Also old ids must fit in 24 bits.
-- ---------------------------------------------------------------------------------------------------------------------
DO (SELECT 1
  UNION ALL (SELECT 1 FROM `exams` WHERE `id` >= 16777216 LIMIT 1)
  UNION ALL (SELECT 1 FROM `practice_sessions` WHERE `id` >= 16777216 LIMIT 1)
  UNION ALL (SELECT 1 FROM `exam_questions` c LEFT JOIN `exams` e ON e.`id` = c.`exam_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `exam_attachments` c LEFT JOIN `exams` e ON e.`id` = c.`exam_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `crawl_jobs` c LEFT JOIN `exams` e ON e.`id` = c.`exam_id` WHERE c.`exam_id` IS NOT NULL AND e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `user_exams` c LEFT JOIN `exams` e ON e.`id` = c.`exam_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `exam_attempts` c LEFT JOIN `exams` e ON e.`id` = c.`exam_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `practice_sessions` c LEFT JOIN `exams` e ON e.`id` = c.`exam_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `answer_reports` c LEFT JOIN `exams` e ON e.`id` = c.`exam_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `question_explanations` c LEFT JOIN `exams` e ON e.`id` = c.`exam_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `explanation_purchases` c LEFT JOIN `exams` e ON e.`id` = c.`exam_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `explanation_unlocks` c LEFT JOIN `exams` e ON e.`id` = c.`exam_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `review_items` c LEFT JOIN `exams` e ON e.`id` = c.`exam_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `saved_questions` c LEFT JOIN `exams` e ON e.`id` = c.`exam_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `explanation_feedback` c LEFT JOIN `exams` e ON e.`id` = c.`exam_id` WHERE e.`id` IS NULL LIMIT 1)
);

-- ---------------------------------------------------------------------------------------------------------------------
-- 1. Mapping tables: old INT id (as text, to join the converted CHAR columns through the primary key) -> UUID v7.
--    Layout: 12 hex ms | '7' + 3 hex (old id bits 12..23) | '8' + 3 hex (old id bits 0..11) | 12 hex random
-- ---------------------------------------------------------------------------------------------------------------------
CREATE TABLE `_0079_exam_ids` (
  `old_id` VARCHAR(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `new_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`old_id`),
  UNIQUE INDEX `_0079_exam_ids_new_id_key`(`new_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `_0079_session_ids` (
  `old_id` VARCHAR(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `new_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`old_id`),
  UNIQUE INDEX `_0079_session_ids_new_id_key`(`new_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `_0079_exam_ids` (`old_id`, `new_id`)
SELECT CAST(`id` AS CHAR), LOWER(CONCAT_WS('-',
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 1, 8),
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 9, 4),
  CONCAT('7', LPAD(HEX((`id` >> 12) & 4095), 3, '0')),
  CONCAT('8', LPAD(HEX(`id` & 4095), 3, '0')),
  HEX(RANDOM_BYTES(6))))
FROM `exams`;

INSERT INTO `_0079_session_ids` (`old_id`, `new_id`)
SELECT CAST(`id` AS CHAR), LOWER(CONCAT_WS('-',
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 1, 8),
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 9, 4),
  CONCAT('7', LPAD(HEX((`id` >> 12) & 4095), 3, '0')),
  CONCAT('8', LPAD(HEX(`id` & 4095), 3, '0')),
  HEX(RANDOM_BYTES(6))))
FROM `practice_sessions`;

-- ---------------------------------------------------------------------------------------------------------------------
-- 2. Drop every foreign key that points at exams.id (metadata only; the indexes stay and are reused in step 6).
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE `exam_questions` DROP FOREIGN KEY `exam_questions_exam_id_fkey`;
ALTER TABLE `exam_attachments` DROP FOREIGN KEY `exam_attachments_exam_id_fkey`;
ALTER TABLE `crawl_jobs` DROP FOREIGN KEY `crawl_jobs_exam_id_fkey`;
ALTER TABLE `user_exams` DROP FOREIGN KEY `user_exams_exam_id_fkey`;
ALTER TABLE `exam_attempts` DROP FOREIGN KEY `exam_attempts_exam_id_fkey`;
ALTER TABLE `practice_sessions` DROP FOREIGN KEY `practice_sessions_exam_id_fkey`;
ALTER TABLE `answer_reports` DROP FOREIGN KEY `answer_reports_exam_id_fkey`;
ALTER TABLE `question_explanations` DROP FOREIGN KEY `question_explanations_exam_id_fkey`;
ALTER TABLE `explanation_purchases` DROP FOREIGN KEY `explanation_purchases_exam_id_fkey`;
ALTER TABLE `explanation_unlocks` DROP FOREIGN KEY `explanation_unlocks_exam_id_fkey`;
ALTER TABLE `review_items` DROP FOREIGN KEY `review_items_exam_id_fkey`;
ALTER TABLE `saved_questions` DROP FOREIGN KEY `saved_questions_exam_id_fkey`;
ALTER TABLE `explanation_feedback` DROP FOREIGN KEY `explanation_feedback_exam_id_fkey`;

-- ---------------------------------------------------------------------------------------------------------------------
-- 3. Parents: convert in place (one rebuild each; the primary key is kept, AUTO_INCREMENT goes away), then rewrite.
--    INT -> CHAR keeps the value as text ('123'), which is what the mapping tables join on.
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE `exams`
  MODIFY `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  ALGORITHM=COPY;
UPDATE `exams` t JOIN `_0079_exam_ids` m ON m.`old_id` = t.`id` SET t.`id` = m.`new_id`;

ALTER TABLE `practice_sessions`
  MODIFY `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  MODIFY `exam_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  ALGORITHM=COPY;
UPDATE `practice_sessions` t
  JOIN `_0079_session_ids` s ON s.`old_id` = t.`id`
  JOIN `_0079_exam_ids` m ON m.`old_id` = t.`exam_id`
  SET t.`id` = s.`new_id`, t.`exam_id` = m.`new_id`;

-- ---------------------------------------------------------------------------------------------------------------------
-- 4. Children: exam_id INT -> CHAR(36) (one rebuild each, indexes keep their names), then rewrite.
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE `exam_questions` MODIFY `exam_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `exam_questions` t JOIN `_0079_exam_ids` m ON m.`old_id` = t.`exam_id` SET t.`exam_id` = m.`new_id`;

ALTER TABLE `exam_attachments` MODIFY `exam_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `exam_attachments` t JOIN `_0079_exam_ids` m ON m.`old_id` = t.`exam_id` SET t.`exam_id` = m.`new_id`;

ALTER TABLE `crawl_jobs` MODIFY `exam_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=COPY;
UPDATE `crawl_jobs` t JOIN `_0079_exam_ids` m ON m.`old_id` = t.`exam_id` SET t.`exam_id` = m.`new_id`;

ALTER TABLE `user_exams` MODIFY `exam_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `user_exams` t JOIN `_0079_exam_ids` m ON m.`old_id` = t.`exam_id` SET t.`exam_id` = m.`new_id`;

ALTER TABLE `exam_attempts` MODIFY `exam_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `exam_attempts` t JOIN `_0079_exam_ids` m ON m.`old_id` = t.`exam_id` SET t.`exam_id` = m.`new_id`;

ALTER TABLE `answer_reports` MODIFY `exam_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `answer_reports` t JOIN `_0079_exam_ids` m ON m.`old_id` = t.`exam_id` SET t.`exam_id` = m.`new_id`;

ALTER TABLE `question_explanations` MODIFY `exam_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `question_explanations` t JOIN `_0079_exam_ids` m ON m.`old_id` = t.`exam_id` SET t.`exam_id` = m.`new_id`;

ALTER TABLE `explanation_purchases` MODIFY `exam_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `explanation_purchases` t JOIN `_0079_exam_ids` m ON m.`old_id` = t.`exam_id` SET t.`exam_id` = m.`new_id`;

ALTER TABLE `explanation_unlocks` MODIFY `exam_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `explanation_unlocks` t JOIN `_0079_exam_ids` m ON m.`old_id` = t.`exam_id` SET t.`exam_id` = m.`new_id`;

ALTER TABLE `review_items` MODIFY `exam_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `review_items` t JOIN `_0079_exam_ids` m ON m.`old_id` = t.`exam_id` SET t.`exam_id` = m.`new_id`;

ALTER TABLE `saved_questions` MODIFY `exam_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `saved_questions` t JOIN `_0079_exam_ids` m ON m.`old_id` = t.`exam_id` SET t.`exam_id` = m.`new_id`;

ALTER TABLE `explanation_feedback` MODIFY `exam_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `explanation_feedback` t JOIN `_0079_exam_ids` m ON m.`old_id` = t.`exam_id` SET t.`exam_id` = m.`new_id`;

-- ---------------------------------------------------------------------------------------------------------------------
-- 5. Soft references (no FK). An id whose exam was deleted earlier has nothing to map to and becomes NULL.
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE `free_explain_turns` MODIFY `used_exam_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=COPY;
UPDATE `free_explain_turns` t LEFT JOIN `_0079_exam_ids` m ON m.`old_id` = t.`used_exam_id`
  SET t.`used_exam_id` = m.`new_id` WHERE t.`used_exam_id` IS NOT NULL;

ALTER TABLE `question_group_stats` MODIFY `last_seen_exam_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=COPY;
UPDATE `question_group_stats` t LEFT JOIN `_0079_exam_ids` m ON m.`old_id` = t.`last_seen_exam_id`
  SET t.`last_seen_exam_id` = m.`new_id` WHERE t.`last_seen_exam_id` IS NOT NULL;

-- Admin notices link to /admin/exams/<id> (fetch.done, ai.failed). '/admin/exams/' is 13 chars.
UPDATE `admin_notices` n JOIN `_0079_exam_ids` m ON m.`old_id` = SUBSTRING(n.`link`, 14)
  SET n.`link` = CONCAT('/admin/exams/', m.`new_id`) WHERE n.`link` LIKE '/admin/exams/%';

-- ---------------------------------------------------------------------------------------------------------------------
-- 6. Guard: every id and FK value must now be a 36-char UUID (stops before re-adding FKs without checks), then
--    recreate the foreign keys with the same names and actions as before.
-- ---------------------------------------------------------------------------------------------------------------------
DO (SELECT 1
  UNION ALL (SELECT 1 FROM `exams` WHERE CHAR_LENGTH(`id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `practice_sessions` WHERE CHAR_LENGTH(`id`) <> 36 OR CHAR_LENGTH(`exam_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `exam_questions` WHERE CHAR_LENGTH(`exam_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `exam_attachments` WHERE CHAR_LENGTH(`exam_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `crawl_jobs` WHERE CHAR_LENGTH(`exam_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `user_exams` WHERE CHAR_LENGTH(`exam_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `exam_attempts` WHERE CHAR_LENGTH(`exam_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `answer_reports` WHERE CHAR_LENGTH(`exam_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `question_explanations` WHERE CHAR_LENGTH(`exam_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `explanation_purchases` WHERE CHAR_LENGTH(`exam_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `explanation_unlocks` WHERE CHAR_LENGTH(`exam_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `review_items` WHERE CHAR_LENGTH(`exam_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `saved_questions` WHERE CHAR_LENGTH(`exam_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `explanation_feedback` WHERE CHAR_LENGTH(`exam_id`) <> 36 LIMIT 1)
);

SET FOREIGN_KEY_CHECKS = 0;
ALTER TABLE `exam_questions` ADD CONSTRAINT `exam_questions_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `exam_attachments` ADD CONSTRAINT `exam_attachments_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `crawl_jobs` ADD CONSTRAINT `crawl_jobs_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `user_exams` ADD CONSTRAINT `user_exams_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `exam_attempts` ADD CONSTRAINT `exam_attempts_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `practice_sessions` ADD CONSTRAINT `practice_sessions_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `answer_reports` ADD CONSTRAINT `answer_reports_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `question_explanations` ADD CONSTRAINT `question_explanations_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `explanation_purchases` ADD CONSTRAINT `explanation_purchases_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `explanation_unlocks` ADD CONSTRAINT `explanation_unlocks_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `review_items` ADD CONSTRAINT `review_items_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `saved_questions` ADD CONSTRAINT `saved_questions_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `explanation_feedback` ADD CONSTRAINT `explanation_feedback_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------------------------------------------------
-- 7. Clean up the mapping tables.
-- ---------------------------------------------------------------------------------------------------------------------
DROP TABLE `_0079_exam_ids`;
DROP TABLE `_0079_session_ids`;
