-- =====================================================================================================================
-- 0081 uuid7_subject_money  -- DESTRUCTIVE: changes six primary keys and every column that points at them, rewrites rows.
--                              NOT additive. Approved by the owner (decision 0012).
--
-- Primary keys INT AUTO_INCREMENT -> CHAR(36) UUID v7:
--   subjects.id; money rows users see: deposit_orders.id, wallet_transactions.id, plan_purchases.id, credit_lots.id,
--   gift_code_redemptions.id.
-- Columns repointed to the new ids (FK names and ON DELETE/UPDATE rules unchanged):
--   subject_id of subject_chapters, question_groups, question_group_members, chapter_stats, question_group_stats,
--   similarity_job_runs (the PK) -- 6 FKs; material_uploads.subject_id (soft, NOT NULL: the guard requires its subject);
--   bank_transactions.deposit_order_id (FK, nullable, unique); referral_rewards.deposit_order_id (soft, unique: the guard
--   requires its deposit order, so the "one commission per deposit" rule keeps holding for every old order).
--   Nothing references wallet_transactions, plan_purchases, credit_lots or gift_code_redemptions; only their id changes.
-- Kept INT on purpose: the own ids of subject_chapters, question_groups (also question_group_members.group_id and
-- question_group_stats.group_id), question_group_members, chapter_stats, bank_transactions, referral_rewards: none is
-- the identifier of a detail page. subject_issues, subject_inferred_topics and subject_chunks key subjects by code.
-- Not affected: deposit codes (random, what SePay matches and what every user/mail link carries), wallet notes (they name
-- the deposit code, gift code or thread, never one of these ids), admin notice links (no id of these tables).
--
-- BEFORE DEPLOY (mandatory):
--   1. Full backup:  mysqldump --single-transaction --routines --triggers <db> > backup_before_0081.sql
--   2. SELECT VERSION(), @@sql_require_primary_key;   -- the second value must be 0
--   3. No job running: no crawl job RUNNING, no slide analysis QUEUED/RUNNING, no marketing broadcast SENDING, and the
--      nightly similarity job and SePay sync are not in the middle of a run (stopping the API stops both):
--        SELECT (SELECT COUNT(*) FROM crawl_jobs WHERE status = 'RUNNING') AS crawl,
--               (SELECT COUNT(*) FROM material_uploads WHERE status IN ('QUEUED', 'RUNNING')) AS slides,
--               (SELECT COUNT(*) FROM marketing_broadcasts WHERE status = 'SENDING') AS broadcasts;   -- all 0
--   4. Stop the API before migrating (pm2 stop fepass-api): the old build writes INT ids (new deposits, wallet rows, the
--      SePay cron) and would fail or race while tables are converted. deploy.sh starts it again after the build. Ship
--      the frontend right after. Bank transfers made while the API is stopped are picked up by the next SePay sync.
--   5. Test this file on a copy of the production dump first (same MySQL version), running the VERIFY queries below.
-- The migration stops by itself before changing anything if an orphan row exists or an old id is >= 2^24 (error 1242
-- "Subquery returns more than 1 row" from the first DO statement): fix the data, run
--   npx prisma migrate resolve --rolled-back 0081_uuid7_subject_money
-- (Prisma records the failed run and refuses to continue with P3009 until then), then deploy again.
-- After ANY restore of the backup taken above, also run:
--   DROP TABLE IF EXISTS _0081_subject_ids, _0081_deposit_ids, _0081_wallet_ids, _0081_plan_ids, _0081_lot_ids, _0081_redemption_ids;
-- (a dump restore does not remove tables created after the dump; step 1 below would fail on them).
--
-- HOW: same pattern as 0079/0080. One mapping table per converted primary key (old INT id as text -> new UUID). The FKs
-- that point at subjects and deposit_orders are dropped, then each table has its columns converted to CHAR(36) by ONE
-- ALTER (ALGORITHM=COPY, a single rebuild per table; primary keys, unique keys and indexes keep their names and column
-- order), then one UPDATE ... JOIN rewrites the values. No column is dropped or renamed (MySQL 8.0.29/8.0.30 corrupted
-- data when `id` was dropped and `new_id` renamed in one ALTER). FKs are re-added with FOREIGN_KEY_CHECKS=0 (in place, no
-- extra rebuild) after a DO guard checks every value was mapped.
--
-- Each row gets a UUID v7 built in SQL from its created_at (ms since epoch, read as stored), version 7, variant 10, then
-- the low 24 bits of the old id ("-7hhh-8lll-": bits 12..23 and 0..11; rows of the same millisecond keep their old order
-- and the value is unique without relying on randomness), then 48 random bits. Text order of the new ids =
-- (created_at, old id) order, so ORDER BY id (wallet history, deposit and redemption lists, credit lot tie-break) still
-- means creation order. No legacy lookup is needed: no signed token, mail or link carries one of these ids.
--
-- EXPECTED COST: 15 tables are copied once each and every row is updated once (one transaction per table). The largest
-- is usually wallet_transactions, then question_group_members, bank_transactions and deposit_orders; subjects and their
-- stats are small. Writes to a table are blocked while it is copied; keep the API stopped for the whole run. Measured
-- on MySQL 8.0.30 (laptop SSD), see the PR / decision 0012 for the numbers. Expect several times longer on a small VPS;
-- size the big tables first:
--   SELECT table_name, table_rows, ROUND((data_length+index_length)/1048576) AS mb FROM information_schema.tables
--   WHERE table_schema = DATABASE() AND table_name IN ('wallet_transactions', 'question_group_members', 'bank_transactions',
--   'deposit_orders', 'credit_lots', 'gift_code_redemptions', 'plan_purchases', 'referral_rewards');
--
-- VERIFY money (run before and after; every value must be identical). The checksums join each row to its owner's email
-- and each deposit link to the deposit code, so they only stay equal if every row still belongs to the same person and
-- every bank row / referral reward still points at the same deposit order:
--   SELECT 'users balance', COUNT(*), SUM(balance), 0 FROM users
--   UNION ALL SELECT 'deposit_orders', COUNT(*), SUM(d.amount), SUM(CRC32(CONCAT_WS(':', u.email, d.code, d.amount, d.status, d.created_at, d.paid_at))) FROM deposit_orders d JOIN users u ON u.id = d.user_id
--   UNION ALL SELECT 'bank_transactions', COUNT(*), SUM(b.amount_in) + COUNT(b.deposit_order_id), SUM(CRC32(CONCAT_WS(':', b.sepay_id, b.amount_in, b.status, d.code))) FROM bank_transactions b LEFT JOIN deposit_orders d ON d.id = b.deposit_order_id
--   UNION ALL SELECT 'referral_rewards', COUNT(*), SUM(x.amount) + COUNT(x.deposit_order_id), SUM(CRC32(CONCAT_WS(':', a.email, b.email, x.type, x.amount, d.code))) FROM referral_rewards x JOIN users a ON a.id = x.referrer_id JOIN users b ON b.id = x.referred_id LEFT JOIN deposit_orders d ON d.id = x.deposit_order_id
--   UNION ALL SELECT 'wallet_transactions', COUNT(*), SUM(w.amount) + SUM(w.balance_after), SUM(CRC32(CONCAT_WS(':', u.email, w.type, w.amount, w.balance_after, w.note, w.created_at))) FROM wallet_transactions w JOIN users u ON u.id = w.user_id
--   UNION ALL SELECT 'plan_purchases', COUNT(*), SUM(p.price) + SUM(p.months), SUM(CRC32(CONCAT_WS(':', u.email, p.plan, p.months, p.price, p.starts_at, p.ends_at))) FROM plan_purchases p JOIN users u ON u.id = p.user_id
--   UNION ALL SELECT 'credit_lots', COUNT(*), SUM(c.amount) + SUM(c.remaining), SUM(CRC32(CONCAT_WS(':', u.email, c.source, c.amount, c.remaining, c.expires_at, c.note))) FROM credit_lots c JOIN users u ON u.id = c.user_id
--   UNION ALL SELECT 'gift_code_redemptions', COUNT(*), SUM(r.amount), SUM(CRC32(CONCAT_WS(':', u.email, g.code, r.amount, r.created_at))) FROM gift_code_redemptions r JOIN users u ON u.id = r.user_id JOIN gift_codes g ON g.id = r.gift_code_id
--   -- users whose newest ledger row (highest id) does not end on their balance; must not change (it checks id order)
--   UNION ALL SELECT 'ledger tail mismatch', COUNT(*), 0, 0 FROM users u JOIN wallet_transactions w ON w.id = (SELECT MAX(x.id) FROM wallet_transactions x WHERE x.user_id = u.id) WHERE w.balance_after <> u.balance;
--   ('ledger tail mismatch' is only meaningful as a before/after comparison around this migration: two rows created later in the same millisecond may sort either way by id)
-- VERIFY subjects (before and after, identical; checksums join each row to its subject code):
--   SELECT 'subjects', COUNT(*), SUM(CRC32(CONCAT_WS(':', code, name, semester))) FROM subjects
--   UNION ALL SELECT 'subject_chapters', COUNT(*), SUM(CRC32(CONCAT_WS(':', s.code, c.id, c.number, c.title))) FROM subject_chapters c JOIN subjects s ON s.id = c.subject_id
--   UNION ALL SELECT 'question_groups', COUNT(*), SUM(CRC32(CONCAT_WS(':', s.code, g.id, g.member_count))) FROM question_groups g JOIN subjects s ON s.id = g.subject_id
--   UNION ALL SELECT 'question_group_members', COUNT(*), SUM(CRC32(CONCAT_WS(':', s.code, m.group_id, m.question_id))) FROM question_group_members m JOIN subjects s ON s.id = m.subject_id
--   UNION ALL SELECT 'chapter_stats', COUNT(*), SUM(CRC32(CONCAT_WS(':', s.code, c.chapter, c.question_count, c.exams_with_chapter))) FROM chapter_stats c JOIN subjects s ON s.id = c.subject_id
--   UNION ALL SELECT 'question_group_stats', COUNT(*), SUM(CRC32(CONCAT_WS(':', s.code, q.group_id, q.exams_with_group, q.representative_question_id))) FROM question_group_stats q JOIN subjects s ON s.id = q.subject_id
--   UNION ALL SELECT 'similarity_job_runs', COUNT(*), SUM(CRC32(CONCAT_WS(':', s.code, r.exam_signature, r.hash_cursor))) FROM similarity_job_runs r JOIN subjects s ON s.id = r.subject_id
--   UNION ALL SELECT 'material_uploads', COUNT(*), SUM(CRC32(CONCAT_WS(':', s.code, x.id))) FROM material_uploads x JOIN subjects s ON s.id = x.subject_id;
-- VERIFY after (every row must be 0):
--   SELECT 'non-uuid ids', (SELECT COUNT(*) FROM subjects WHERE CHAR_LENGTH(id) <> 36) + (SELECT COUNT(*) FROM deposit_orders WHERE CHAR_LENGTH(id) <> 36)
--     + (SELECT COUNT(*) FROM wallet_transactions WHERE CHAR_LENGTH(id) <> 36) + (SELECT COUNT(*) FROM plan_purchases WHERE CHAR_LENGTH(id) <> 36)
--     + (SELECT COUNT(*) FROM credit_lots WHERE CHAR_LENGTH(id) <> 36) + (SELECT COUNT(*) FROM gift_code_redemptions WHERE CHAR_LENGTH(id) <> 36)
--   UNION ALL SELECT 'orphans', (SELECT COUNT(*) FROM bank_transactions c LEFT JOIN deposit_orders e ON e.id = c.deposit_order_id WHERE c.deposit_order_id IS NOT NULL AND e.id IS NULL)
--     + (SELECT COUNT(*) FROM referral_rewards c LEFT JOIN deposit_orders e ON e.id = c.deposit_order_id WHERE c.deposit_order_id IS NOT NULL AND e.id IS NULL)
--     + (SELECT COUNT(*) FROM material_uploads c LEFT JOIN subjects e ON e.id = c.subject_id WHERE e.id IS NULL)
--     + (SELECT COUNT(*) FROM question_group_members c LEFT JOIN subjects e ON e.id = c.subject_id WHERE e.id IS NULL);
--   (the same LEFT JOIN check works for any other subject table in the list above)
--
-- ROLLBACK: there is no down migration. Restore the mysqldump taken above (it also restores `_prisma_migrations` without
-- this migration) and redeploy the previous backend AND frontend builds (the new frontend expects string ids). Deposits
-- paid after the deploy are lost by the restore: compare bank_transactions with SePay and re-run the sync after restoring.
-- MySQL DDL is not transactional: if this migration fails half-way, do NOT re-run it on top of the partial state; restore
-- the backup, fix, then deploy again.
-- =====================================================================================================================

-- ---------------------------------------------------------------------------------------------------------------------
-- 0. Guard, before any change: no orphan row may exist (each branch returns a row only on a problem; any extra row makes
--    the scalar subquery fail with error 1242 and the migration stops untouched). Also old ids must fit in 24 bits.
-- ---------------------------------------------------------------------------------------------------------------------
DO (SELECT 1
  UNION ALL (SELECT 1 FROM `subjects` WHERE `id` >= 16777216 LIMIT 1)
  UNION ALL (SELECT 1 FROM `deposit_orders` WHERE `id` >= 16777216 LIMIT 1)
  UNION ALL (SELECT 1 FROM `wallet_transactions` WHERE `id` >= 16777216 LIMIT 1)
  UNION ALL (SELECT 1 FROM `plan_purchases` WHERE `id` >= 16777216 LIMIT 1)
  UNION ALL (SELECT 1 FROM `credit_lots` WHERE `id` >= 16777216 LIMIT 1)
  UNION ALL (SELECT 1 FROM `gift_code_redemptions` WHERE `id` >= 16777216 LIMIT 1)
  UNION ALL (SELECT 1 FROM `subject_chapters` c LEFT JOIN `subjects` e ON e.`id` = c.`subject_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `question_groups` c LEFT JOIN `subjects` e ON e.`id` = c.`subject_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `question_group_members` c LEFT JOIN `subjects` e ON e.`id` = c.`subject_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `chapter_stats` c LEFT JOIN `subjects` e ON e.`id` = c.`subject_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `question_group_stats` c LEFT JOIN `subjects` e ON e.`id` = c.`subject_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `similarity_job_runs` c LEFT JOIN `subjects` e ON e.`id` = c.`subject_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `material_uploads` c LEFT JOIN `subjects` e ON e.`id` = c.`subject_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `bank_transactions` c LEFT JOIN `deposit_orders` e ON e.`id` = c.`deposit_order_id` WHERE c.`deposit_order_id` IS NOT NULL AND e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `referral_rewards` c LEFT JOIN `deposit_orders` e ON e.`id` = c.`deposit_order_id` WHERE c.`deposit_order_id` IS NOT NULL AND e.`id` IS NULL LIMIT 1)
);

-- ---------------------------------------------------------------------------------------------------------------------
-- 1. Mapping tables: old INT id (as text, to join the converted CHAR columns through the primary key) -> UUID v7.
--    Layout: 12 hex ms | '7' + 3 hex (old id bits 12..23) | '8' + 3 hex (old id bits 0..11) | 12 hex random
-- ---------------------------------------------------------------------------------------------------------------------
CREATE TABLE `_0081_subject_ids` (
  `old_id` VARCHAR(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `new_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`old_id`),
  UNIQUE INDEX `_0081_subject_ids_new_id_key`(`new_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `_0081_deposit_ids` LIKE `_0081_subject_ids`;
CREATE TABLE `_0081_wallet_ids` LIKE `_0081_subject_ids`;
CREATE TABLE `_0081_plan_ids` LIKE `_0081_subject_ids`;
CREATE TABLE `_0081_lot_ids` LIKE `_0081_subject_ids`;
CREATE TABLE `_0081_redemption_ids` LIKE `_0081_subject_ids`;

INSERT INTO `_0081_subject_ids` (`old_id`, `new_id`)
SELECT CAST(`id` AS CHAR), LOWER(CONCAT_WS('-',
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 1, 8),
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 9, 4),
  CONCAT('7', LPAD(HEX((`id` >> 12) & 4095), 3, '0')),
  CONCAT('8', LPAD(HEX(`id` & 4095), 3, '0')),
  HEX(RANDOM_BYTES(6))))
FROM `subjects`;

INSERT INTO `_0081_deposit_ids` (`old_id`, `new_id`)
SELECT CAST(`id` AS CHAR), LOWER(CONCAT_WS('-',
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 1, 8),
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 9, 4),
  CONCAT('7', LPAD(HEX((`id` >> 12) & 4095), 3, '0')),
  CONCAT('8', LPAD(HEX(`id` & 4095), 3, '0')),
  HEX(RANDOM_BYTES(6))))
FROM `deposit_orders`;

INSERT INTO `_0081_wallet_ids` (`old_id`, `new_id`)
SELECT CAST(`id` AS CHAR), LOWER(CONCAT_WS('-',
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 1, 8),
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 9, 4),
  CONCAT('7', LPAD(HEX((`id` >> 12) & 4095), 3, '0')),
  CONCAT('8', LPAD(HEX(`id` & 4095), 3, '0')),
  HEX(RANDOM_BYTES(6))))
FROM `wallet_transactions`;

INSERT INTO `_0081_plan_ids` (`old_id`, `new_id`)
SELECT CAST(`id` AS CHAR), LOWER(CONCAT_WS('-',
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 1, 8),
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 9, 4),
  CONCAT('7', LPAD(HEX((`id` >> 12) & 4095), 3, '0')),
  CONCAT('8', LPAD(HEX(`id` & 4095), 3, '0')),
  HEX(RANDOM_BYTES(6))))
FROM `plan_purchases`;

INSERT INTO `_0081_lot_ids` (`old_id`, `new_id`)
SELECT CAST(`id` AS CHAR), LOWER(CONCAT_WS('-',
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 1, 8),
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 9, 4),
  CONCAT('7', LPAD(HEX((`id` >> 12) & 4095), 3, '0')),
  CONCAT('8', LPAD(HEX(`id` & 4095), 3, '0')),
  HEX(RANDOM_BYTES(6))))
FROM `credit_lots`;

INSERT INTO `_0081_redemption_ids` (`old_id`, `new_id`)
SELECT CAST(`id` AS CHAR), LOWER(CONCAT_WS('-',
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 1, 8),
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 9, 4),
  CONCAT('7', LPAD(HEX((`id` >> 12) & 4095), 3, '0')),
  CONCAT('8', LPAD(HEX(`id` & 4095), 3, '0')),
  HEX(RANDOM_BYTES(6))))
FROM `gift_code_redemptions`;

-- ---------------------------------------------------------------------------------------------------------------------
-- 2. Drop every foreign key that points at subjects.id or deposit_orders.id (metadata only; the indexes stay and are
--    reused in step 6).
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE `subject_chapters` DROP FOREIGN KEY `subject_chapters_subject_id_fkey`;
ALTER TABLE `question_groups` DROP FOREIGN KEY `question_groups_subject_id_fkey`;
ALTER TABLE `question_group_members` DROP FOREIGN KEY `question_group_members_subject_id_fkey`;
ALTER TABLE `chapter_stats` DROP FOREIGN KEY `chapter_stats_subject_id_fkey`;
ALTER TABLE `question_group_stats` DROP FOREIGN KEY `question_group_stats_subject_id_fkey`;
ALTER TABLE `similarity_job_runs` DROP FOREIGN KEY `similarity_job_runs_subject_id_fkey`;
ALTER TABLE `bank_transactions` DROP FOREIGN KEY `bank_transactions_deposit_order_id_fkey`;

-- ---------------------------------------------------------------------------------------------------------------------
-- 3. Subjects and every subject_id column: convert in place (one rebuild per table; the primary key is kept,
--    AUTO_INCREMENT goes away), then rewrite. INT -> CHAR keeps the value as text ('123'), which is what the mapping
--    table joins on. material_uploads.subject_id has no FK (guarded in step 0).
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE `subjects` MODIFY `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `subjects` t JOIN `_0081_subject_ids` m ON m.`old_id` = t.`id` SET t.`id` = m.`new_id`;

ALTER TABLE `subject_chapters` MODIFY `subject_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `subject_chapters` t JOIN `_0081_subject_ids` m ON m.`old_id` = t.`subject_id` SET t.`subject_id` = m.`new_id`;

ALTER TABLE `question_groups` MODIFY `subject_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `question_groups` t JOIN `_0081_subject_ids` m ON m.`old_id` = t.`subject_id` SET t.`subject_id` = m.`new_id`;

ALTER TABLE `question_group_members` MODIFY `subject_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `question_group_members` t JOIN `_0081_subject_ids` m ON m.`old_id` = t.`subject_id` SET t.`subject_id` = m.`new_id`;

ALTER TABLE `chapter_stats` MODIFY `subject_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `chapter_stats` t JOIN `_0081_subject_ids` m ON m.`old_id` = t.`subject_id` SET t.`subject_id` = m.`new_id`;

ALTER TABLE `question_group_stats` MODIFY `subject_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `question_group_stats` t JOIN `_0081_subject_ids` m ON m.`old_id` = t.`subject_id` SET t.`subject_id` = m.`new_id`;

ALTER TABLE `similarity_job_runs` MODIFY `subject_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `similarity_job_runs` t JOIN `_0081_subject_ids` m ON m.`old_id` = t.`subject_id` SET t.`subject_id` = m.`new_id`;

ALTER TABLE `material_uploads` MODIFY `subject_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `material_uploads` t JOIN `_0081_subject_ids` m ON m.`old_id` = t.`subject_id` SET t.`subject_id` = m.`new_id`;

-- ---------------------------------------------------------------------------------------------------------------------
-- 4. Deposit orders and the two columns pointing at them (bank_transactions: FK; referral_rewards: soft, guarded in
--    step 0). Unmatched bank rows keep deposit_order_id NULL. Both unique keys keep their names.
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE `deposit_orders` MODIFY `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `deposit_orders` t JOIN `_0081_deposit_ids` m ON m.`old_id` = t.`id` SET t.`id` = m.`new_id`;

ALTER TABLE `bank_transactions` MODIFY `deposit_order_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=COPY;
UPDATE `bank_transactions` t JOIN `_0081_deposit_ids` m ON m.`old_id` = t.`deposit_order_id` SET t.`deposit_order_id` = m.`new_id`;

ALTER TABLE `referral_rewards` MODIFY `deposit_order_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=COPY;
UPDATE `referral_rewards` t JOIN `_0081_deposit_ids` m ON m.`old_id` = t.`deposit_order_id` SET t.`deposit_order_id` = m.`new_id`;

-- ---------------------------------------------------------------------------------------------------------------------
-- 5. Money rows nothing points at: only their own id changes.
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE `wallet_transactions` MODIFY `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `wallet_transactions` t JOIN `_0081_wallet_ids` m ON m.`old_id` = t.`id` SET t.`id` = m.`new_id`;

ALTER TABLE `plan_purchases` MODIFY `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `plan_purchases` t JOIN `_0081_plan_ids` m ON m.`old_id` = t.`id` SET t.`id` = m.`new_id`;

ALTER TABLE `credit_lots` MODIFY `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `credit_lots` t JOIN `_0081_lot_ids` m ON m.`old_id` = t.`id` SET t.`id` = m.`new_id`;

ALTER TABLE `gift_code_redemptions` MODIFY `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `gift_code_redemptions` t JOIN `_0081_redemption_ids` m ON m.`old_id` = t.`id` SET t.`id` = m.`new_id`;

-- ---------------------------------------------------------------------------------------------------------------------
-- 6. Guard: every converted value must now be a 36-char UUID (stops before re-adding FKs without checks).
-- ---------------------------------------------------------------------------------------------------------------------
DO (SELECT 1
  UNION ALL (SELECT 1 FROM `subjects` WHERE CHAR_LENGTH(`id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `subject_chapters` WHERE CHAR_LENGTH(`subject_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `question_groups` WHERE CHAR_LENGTH(`subject_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `question_group_members` WHERE CHAR_LENGTH(`subject_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `chapter_stats` WHERE CHAR_LENGTH(`subject_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `question_group_stats` WHERE CHAR_LENGTH(`subject_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `similarity_job_runs` WHERE CHAR_LENGTH(`subject_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `material_uploads` WHERE CHAR_LENGTH(`subject_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `deposit_orders` WHERE CHAR_LENGTH(`id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `bank_transactions` WHERE CHAR_LENGTH(`deposit_order_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `referral_rewards` WHERE CHAR_LENGTH(`deposit_order_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `wallet_transactions` WHERE CHAR_LENGTH(`id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `plan_purchases` WHERE CHAR_LENGTH(`id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `credit_lots` WHERE CHAR_LENGTH(`id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `gift_code_redemptions` WHERE CHAR_LENGTH(`id`) <> 36 LIMIT 1)
);

-- ---------------------------------------------------------------------------------------------------------------------
-- 7. Recreate the foreign keys with the same names and actions as before.
-- ---------------------------------------------------------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;
ALTER TABLE `subject_chapters` ADD CONSTRAINT `subject_chapters_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `question_groups` ADD CONSTRAINT `question_groups_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `question_group_members` ADD CONSTRAINT `question_group_members_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `chapter_stats` ADD CONSTRAINT `chapter_stats_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `question_group_stats` ADD CONSTRAINT `question_group_stats_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `similarity_job_runs` ADD CONSTRAINT `similarity_job_runs_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `bank_transactions` ADD CONSTRAINT `bank_transactions_deposit_order_id_fkey` FOREIGN KEY (`deposit_order_id`) REFERENCES `deposit_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE, ALGORITHM=INPLACE;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------------------------------------------------
-- 8. Clean up the mapping tables.
-- ---------------------------------------------------------------------------------------------------------------------
DROP TABLE `_0081_subject_ids`, `_0081_deposit_ids`, `_0081_wallet_ids`, `_0081_plan_ids`, `_0081_lot_ids`, `_0081_redemption_ids`;
