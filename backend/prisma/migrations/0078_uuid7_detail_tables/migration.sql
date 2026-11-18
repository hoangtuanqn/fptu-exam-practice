-- =====================================================================================================================
-- 0078 uuid7_detail_tables  -- DESTRUCTIVE: changes primary key types and rewrites existing rows. NOT additive.
--
-- Primary keys INT AUTO_INCREMENT -> CHAR(36) UUID v7 (approved by the owner) on:
--   gift_codes, admin_notices, marketing_broadcasts, coursera_courses, coursera_orders, pro_tickets,
--   explanation_feedback, answer_reports, material_uploads, exam_attempts
-- Foreign key columns repointed to the new ids (their own ids, where they have one, stay INT):
--   gift_code_redemptions.gift_code_id, coursera_orders.course_id, material_pages.upload_id, material_chapters.upload_id
-- Soft reference rewritten: email_campaign_logs.campaign 'broadcast:<int>' -> 'broadcast:<uuid>' (column widened to 48).
--
-- BEFORE DEPLOY (mandatory): take a full backup, e.g.
--   mysqldump --single-transaction --routines --triggers <db> > backup_before_0078.sql
-- BEFORE DEPLOY (mandatory): check the server, then stop if the second value is not 0 (the migration drops a primary key
-- before adding the new one, which fails with sql_require_primary_key=ON and leaves the DB half-migrated):
--   SELECT VERSION(), @@sql_require_primary_key;
-- MySQL 8.0.29/8.0.30 has an INSTANT-DDL bug (dropping `id` and renaming `new_id` in ONE ALTER corrupted data in a local
-- test). This file already uses separate statements with explicit ALGORITHM, but test it on a copy of the data first.
-- Deploy with no slide-analysis job QUEUED/RUNNING (their temp PDF is named after the old int id; such a job fails
-- with "file missing" after this migration and the member re-uploads).
--
-- Each old row gets a UUID v7 built in SQL from its created_at (ms since epoch, UTC, read as stored), version 7,
-- variant 10, then the low 24 bits of the old id (so rows of the same millisecond keep their old order and the value is
-- unique without relying on randomness), then 48 random bits. Text order of the new ids = (created_at, old id) order.
--
-- VERIFY (run before and after, counts must be equal):
--   SELECT 'gift_codes', COUNT(*) FROM gift_codes UNION ALL SELECT 'gift_code_redemptions', COUNT(*) FROM gift_code_redemptions
--   UNION ALL SELECT 'admin_notices', COUNT(*) FROM admin_notices UNION ALL SELECT 'marketing_broadcasts', COUNT(*) FROM marketing_broadcasts
--   UNION ALL SELECT 'coursera_courses', COUNT(*) FROM coursera_courses UNION ALL SELECT 'coursera_orders', COUNT(*) FROM coursera_orders
--   UNION ALL SELECT 'pro_tickets', COUNT(*) FROM pro_tickets UNION ALL SELECT 'explanation_feedback', COUNT(*) FROM explanation_feedback
--   UNION ALL SELECT 'answer_reports', COUNT(*) FROM answer_reports UNION ALL SELECT 'material_uploads', COUNT(*) FROM material_uploads
--   UNION ALL SELECT 'material_pages', COUNT(*) FROM material_pages UNION ALL SELECT 'material_chapters', COUNT(*) FROM material_chapters
--   UNION ALL SELECT 'exam_attempts', COUNT(*) FROM exam_attempts
--   UNION ALL SELECT 'email_campaign_logs broadcast', COUNT(*) FROM email_campaign_logs WHERE campaign LIKE 'broadcast:%';
-- VERIFY after (all must return 0):
--   SELECT COUNT(*) FROM gift_code_redemptions r LEFT JOIN gift_codes g ON g.id = r.gift_code_id WHERE g.id IS NULL;
--   SELECT COUNT(*) FROM coursera_orders o LEFT JOIN coursera_courses c ON c.id = o.course_id WHERE c.id IS NULL;
--   SELECT COUNT(*) FROM material_pages p LEFT JOIN material_uploads u ON u.id = p.upload_id WHERE u.id IS NULL;
--   SELECT COUNT(*) FROM material_chapters p LEFT JOIN material_uploads u ON u.id = p.upload_id WHERE u.id IS NULL;
--   SELECT COUNT(*) FROM email_campaign_logs l LEFT JOIN marketing_broadcasts b ON l.campaign = CONCAT('broadcast:', b.id)
--     WHERE l.campaign LIKE 'broadcast:%' AND b.id IS NULL;
--
-- ROLLBACK: there is no automatic down migration. Restore the mysqldump taken above, delete the
-- `_prisma_migrations` row with migration_name = '0078_uuid7_detail_tables' (the restore already does that if the dump
-- was taken before deploy) and redeploy the previous backend build. If the migration failed half-way, MySQL DDL is not
-- transactional: do not re-run it on top of a partial state; restore the backup, fix, then deploy again.
-- =====================================================================================================================

-- ---------------------------------------------------------------------------------------------------------------------
-- 1. New id columns, backfilled with UUID v7.
--    Layout: 12 hex ms | '7' + 3 hex (old id bits 12..23) | '8' + 3 hex (old id bits 0..11) | 12 hex random
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE `gift_codes` ADD COLUMN `new_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=INPLACE;
ALTER TABLE `admin_notices` ADD COLUMN `new_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=INPLACE;
ALTER TABLE `marketing_broadcasts` ADD COLUMN `new_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=INPLACE;
ALTER TABLE `coursera_courses` ADD COLUMN `new_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=INPLACE;
ALTER TABLE `coursera_orders` ADD COLUMN `new_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=INPLACE;
ALTER TABLE `pro_tickets` ADD COLUMN `new_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=INPLACE;
ALTER TABLE `explanation_feedback` ADD COLUMN `new_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=INPLACE;
ALTER TABLE `answer_reports` ADD COLUMN `new_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=INPLACE;
ALTER TABLE `material_uploads` ADD COLUMN `new_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=INPLACE;
ALTER TABLE `exam_attempts` ADD COLUMN `new_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=INPLACE;

-- Same expression for every table (MySQL has no CREATE FUNCTION without SUPER/log_bin_trust_function_creators).
UPDATE `gift_codes` SET `new_id` = LOWER(CONCAT_WS('-',
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 1, 8),
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 9, 4),
  CONCAT('7', LPAD(HEX((`id` >> 12) & 4095), 3, '0')),
  CONCAT('8', LPAD(HEX(`id` & 4095), 3, '0')),
  HEX(RANDOM_BYTES(6))));
UPDATE `admin_notices` SET `new_id` = LOWER(CONCAT_WS('-',
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 1, 8),
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 9, 4),
  CONCAT('7', LPAD(HEX((`id` >> 12) & 4095), 3, '0')),
  CONCAT('8', LPAD(HEX(`id` & 4095), 3, '0')),
  HEX(RANDOM_BYTES(6))));
UPDATE `marketing_broadcasts` SET `new_id` = LOWER(CONCAT_WS('-',
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 1, 8),
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 9, 4),
  CONCAT('7', LPAD(HEX((`id` >> 12) & 4095), 3, '0')),
  CONCAT('8', LPAD(HEX(`id` & 4095), 3, '0')),
  HEX(RANDOM_BYTES(6))));
UPDATE `coursera_courses` SET `new_id` = LOWER(CONCAT_WS('-',
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 1, 8),
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 9, 4),
  CONCAT('7', LPAD(HEX((`id` >> 12) & 4095), 3, '0')),
  CONCAT('8', LPAD(HEX(`id` & 4095), 3, '0')),
  HEX(RANDOM_BYTES(6))));
UPDATE `coursera_orders` SET `new_id` = LOWER(CONCAT_WS('-',
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 1, 8),
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 9, 4),
  CONCAT('7', LPAD(HEX((`id` >> 12) & 4095), 3, '0')),
  CONCAT('8', LPAD(HEX(`id` & 4095), 3, '0')),
  HEX(RANDOM_BYTES(6))));
UPDATE `pro_tickets` SET `new_id` = LOWER(CONCAT_WS('-',
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 1, 8),
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 9, 4),
  CONCAT('7', LPAD(HEX((`id` >> 12) & 4095), 3, '0')),
  CONCAT('8', LPAD(HEX(`id` & 4095), 3, '0')),
  HEX(RANDOM_BYTES(6))));
UPDATE `explanation_feedback` SET `new_id` = LOWER(CONCAT_WS('-',
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 1, 8),
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 9, 4),
  CONCAT('7', LPAD(HEX((`id` >> 12) & 4095), 3, '0')),
  CONCAT('8', LPAD(HEX(`id` & 4095), 3, '0')),
  HEX(RANDOM_BYTES(6))));
UPDATE `answer_reports` SET `new_id` = LOWER(CONCAT_WS('-',
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 1, 8),
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 9, 4),
  CONCAT('7', LPAD(HEX((`id` >> 12) & 4095), 3, '0')),
  CONCAT('8', LPAD(HEX(`id` & 4095), 3, '0')),
  HEX(RANDOM_BYTES(6))));
UPDATE `material_uploads` SET `new_id` = LOWER(CONCAT_WS('-',
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 1, 8),
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 9, 4),
  CONCAT('7', LPAD(HEX((`id` >> 12) & 4095), 3, '0')),
  CONCAT('8', LPAD(HEX(`id` & 4095), 3, '0')),
  HEX(RANDOM_BYTES(6))));
UPDATE `exam_attempts` SET `new_id` = LOWER(CONCAT_WS('-',
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 1, 8),
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 9, 4),
  CONCAT('7', LPAD(HEX((`id` >> 12) & 4095), 3, '0')),
  CONCAT('8', LPAD(HEX(`id` & 4095), 3, '0')),
  HEX(RANDOM_BYTES(6))));

-- ---------------------------------------------------------------------------------------------------------------------
-- 2. Child FK columns and soft references, filled from the parent's new id while the old int ids still exist.
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE `gift_code_redemptions` ADD COLUMN `new_gift_code_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=INPLACE;
UPDATE `gift_code_redemptions` r JOIN `gift_codes` g ON g.`id` = r.`gift_code_id` SET r.`new_gift_code_id` = g.`new_id`;

ALTER TABLE `coursera_orders` ADD COLUMN `new_course_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=INPLACE;
UPDATE `coursera_orders` o JOIN `coursera_courses` c ON c.`id` = o.`course_id` SET o.`new_course_id` = c.`new_id`;

ALTER TABLE `material_pages` ADD COLUMN `new_upload_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=INPLACE;
UPDATE `material_pages` p JOIN `material_uploads` u ON u.`id` = p.`upload_id` SET p.`new_upload_id` = u.`new_id`;

ALTER TABLE `material_chapters` ADD COLUMN `new_upload_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=INPLACE;
UPDATE `material_chapters` p JOIN `material_uploads` u ON u.`id` = p.`upload_id` SET p.`new_upload_id` = u.`new_id`;

-- 'broadcast:' (10) + uuid (36) = 46 chars; widening VARCHAR in place keeps the values.
ALTER TABLE `email_campaign_logs` MODIFY `campaign` VARCHAR(48) NOT NULL;
UPDATE `email_campaign_logs` l JOIN `marketing_broadcasts` b ON l.`campaign` = CONCAT('broadcast:', b.`id`)
  SET l.`campaign` = CONCAT('broadcast:', b.`new_id`);

-- ---------------------------------------------------------------------------------------------------------------------
-- 3. Drop the foreign keys that point at the old ids, then the child indexes/keys built on the old FK columns.
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE `gift_code_redemptions` DROP FOREIGN KEY `gift_code_redemptions_gift_code_id_fkey`;
ALTER TABLE `coursera_orders` DROP FOREIGN KEY `coursera_orders_course_id_fkey`;
ALTER TABLE `material_pages` DROP FOREIGN KEY `material_pages_upload_id_fkey`;
ALTER TABLE `material_chapters` DROP FOREIGN KEY `material_chapters_upload_id_fkey`;

ALTER TABLE `gift_code_redemptions`
  DROP INDEX `gift_code_redemptions_gift_code_id_user_id_key`,
  DROP COLUMN `gift_code_id`,
  ALGORITHM=INPLACE;
ALTER TABLE `gift_code_redemptions` RENAME COLUMN `new_gift_code_id` TO `gift_code_id`;
ALTER TABLE `gift_code_redemptions`
  MODIFY `gift_code_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL AFTER `id`,
  ADD UNIQUE INDEX `gift_code_redemptions_gift_code_id_user_id_key`(`gift_code_id`, `user_id`);

ALTER TABLE `material_pages`
  DROP PRIMARY KEY,
  DROP COLUMN `upload_id`,
  ALGORITHM=COPY; -- InnoDB refuses INPLACE when a primary key is dropped without a new one
ALTER TABLE `material_pages` RENAME COLUMN `new_upload_id` TO `upload_id`;
ALTER TABLE `material_pages`
  MODIFY `upload_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL FIRST,
  ADD PRIMARY KEY (`upload_id`, `page_no`);

ALTER TABLE `material_chapters`
  DROP PRIMARY KEY,
  DROP COLUMN `upload_id`,
  ALGORITHM=COPY; -- InnoDB refuses INPLACE when a primary key is dropped without a new one
ALTER TABLE `material_chapters` RENAME COLUMN `new_upload_id` TO `upload_id`;
ALTER TABLE `material_chapters`
  MODIFY `upload_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL FIRST,
  ADD PRIMARY KEY (`upload_id`, `chapter_number`);

-- ---------------------------------------------------------------------------------------------------------------------
-- 4. Swap the primary keys of the ten parent tables (indexes that contain `id` are dropped and rebuilt).
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE `gift_codes` MODIFY `id` INTEGER NOT NULL, DROP PRIMARY KEY;
ALTER TABLE `gift_codes` DROP COLUMN `id`, ALGORITHM=INPLACE;
ALTER TABLE `gift_codes` RENAME COLUMN `new_id` TO `id`;
ALTER TABLE `gift_codes` MODIFY `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL FIRST, ADD PRIMARY KEY (`id`);

ALTER TABLE `admin_notices` MODIFY `id` INTEGER NOT NULL, DROP PRIMARY KEY;
ALTER TABLE `admin_notices` DROP COLUMN `id`, ALGORITHM=INPLACE;
ALTER TABLE `admin_notices` RENAME COLUMN `new_id` TO `id`;
ALTER TABLE `admin_notices` MODIFY `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL FIRST, ADD PRIMARY KEY (`id`);

ALTER TABLE `marketing_broadcasts` MODIFY `id` INTEGER NOT NULL, DROP PRIMARY KEY;
ALTER TABLE `marketing_broadcasts` DROP COLUMN `id`, ALGORITHM=INPLACE;
ALTER TABLE `marketing_broadcasts` RENAME COLUMN `new_id` TO `id`;
ALTER TABLE `marketing_broadcasts` MODIFY `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL FIRST, ADD PRIMARY KEY (`id`);

ALTER TABLE `coursera_courses` MODIFY `id` INTEGER NOT NULL, DROP PRIMARY KEY, DROP INDEX `coursera_courses_is_active_id_idx`;
ALTER TABLE `coursera_courses` DROP COLUMN `id`, ALGORITHM=INPLACE;
ALTER TABLE `coursera_courses` RENAME COLUMN `new_id` TO `id`;
ALTER TABLE `coursera_courses` MODIFY `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL FIRST, ADD PRIMARY KEY (`id`),
  ADD INDEX `coursera_courses_is_active_id_idx`(`is_active`, `id`);

ALTER TABLE `coursera_orders` MODIFY `id` INTEGER NOT NULL, DROP PRIMARY KEY,
  DROP INDEX `coursera_orders_user_id_id_idx`, DROP INDEX `coursera_orders_status_id_idx`, DROP INDEX `coursera_orders_course_id_idx`;
ALTER TABLE `coursera_orders` DROP COLUMN `id`, DROP COLUMN `course_id`, ALGORITHM=INPLACE;
ALTER TABLE `coursera_orders` RENAME COLUMN `new_id` TO `id`, RENAME COLUMN `new_course_id` TO `course_id`;
ALTER TABLE `coursera_orders`
  MODIFY `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL FIRST,
  MODIFY `course_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL AFTER `user_id`,
  ADD PRIMARY KEY (`id`),
  ADD INDEX `coursera_orders_user_id_id_idx`(`user_id`, `id`),
  ADD INDEX `coursera_orders_status_id_idx`(`status`, `id`),
  ADD INDEX `coursera_orders_course_id_idx`(`course_id`);

ALTER TABLE `pro_tickets` MODIFY `id` INTEGER NOT NULL, DROP PRIMARY KEY;
ALTER TABLE `pro_tickets` DROP COLUMN `id`, ALGORITHM=INPLACE;
ALTER TABLE `pro_tickets` RENAME COLUMN `new_id` TO `id`;
ALTER TABLE `pro_tickets` MODIFY `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL FIRST, ADD PRIMARY KEY (`id`);

ALTER TABLE `explanation_feedback` MODIFY `id` INTEGER NOT NULL, DROP PRIMARY KEY;
ALTER TABLE `explanation_feedback` DROP COLUMN `id`, ALGORITHM=INPLACE;
ALTER TABLE `explanation_feedback` RENAME COLUMN `new_id` TO `id`;
ALTER TABLE `explanation_feedback` MODIFY `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL FIRST, ADD PRIMARY KEY (`id`);

ALTER TABLE `answer_reports` MODIFY `id` INTEGER NOT NULL, DROP PRIMARY KEY;
ALTER TABLE `answer_reports` DROP COLUMN `id`, ALGORITHM=INPLACE;
ALTER TABLE `answer_reports` RENAME COLUMN `new_id` TO `id`;
ALTER TABLE `answer_reports` MODIFY `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL FIRST, ADD PRIMARY KEY (`id`);

ALTER TABLE `material_uploads` MODIFY `id` INTEGER NOT NULL, DROP PRIMARY KEY;
ALTER TABLE `material_uploads` DROP COLUMN `id`, ALGORITHM=INPLACE;
ALTER TABLE `material_uploads` RENAME COLUMN `new_id` TO `id`;
ALTER TABLE `material_uploads` MODIFY `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL FIRST, ADD PRIMARY KEY (`id`);

ALTER TABLE `exam_attempts` MODIFY `id` INTEGER NOT NULL, DROP PRIMARY KEY;
ALTER TABLE `exam_attempts` DROP COLUMN `id`, ALGORITHM=INPLACE;
ALTER TABLE `exam_attempts` RENAME COLUMN `new_id` TO `id`;
ALTER TABLE `exam_attempts` MODIFY `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL FIRST, ADD PRIMARY KEY (`id`);

-- ---------------------------------------------------------------------------------------------------------------------
-- 5. Recreate the foreign keys with the same names and actions as before.
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE `gift_code_redemptions` ADD CONSTRAINT `gift_code_redemptions_gift_code_id_fkey` FOREIGN KEY (`gift_code_id`) REFERENCES `gift_codes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `coursera_orders` ADD CONSTRAINT `coursera_orders_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `coursera_courses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `material_pages` ADD CONSTRAINT `material_pages_upload_id_fkey` FOREIGN KEY (`upload_id`) REFERENCES `material_uploads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `material_chapters` ADD CONSTRAINT `material_chapters_upload_id_fkey` FOREIGN KEY (`upload_id`) REFERENCES `material_uploads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
