-- =====================================================================================================================
-- 0080 uuid7_user  -- DESTRUCTIVE: changes the users primary key and every column that points at it, rewrites rows.
--                     NOT additive. Approved by the owner (decision 0011).
--
-- Primary key INT AUTO_INCREMENT -> CHAR(36) UUID v7: users.id. Every other table keeps its own id.
-- Foreign key columns repointed to the new user ids (37 FKs, names and ON DELETE/UPDATE rules unchanged):
--   users.referred_by_id (self FK), referral_rewards.referrer_id + referred_id, and user_id of: ai_token_usage,
--   answer_reports, coursera_orders, credit_lots, daily_check_ins, deposit_orders, email_campaign_logs,
--   email_verification_tokens, exam_attempts, explain_chat_usage (part of the PK), explanation_feedback,
--   explanation_purchases, explanation_unlocks, free_explain_turns, gift_code_redemptions, link_reward_requests,
--   material_uploads, password_reset_tokens, pe_downloads, plan_purchases, practice_sessions (nullable), pro_tickets,
--   prompt_events, refresh_tokens, review_items, saved_questions, study_days, user_exam_slots, user_exams (nullable),
--   user_grade_settings (the PK), user_grades, user_question_cards, user_review_logs, wallet_transactions.
-- Soft references (no FK) converted the same way; a value whose user no longer exists becomes NULL:
--   admin_notices.user_id, chat_logs.user_id, crawl_jobs.user_id, exams.created_by_id, coursera_orders.credential_viewed_by,
--   answer_reports.reviewed_by_id + resolved_by_id, explanation_feedback.resolved_by_id;
--   marketing_broadcasts.created_by_id is NOT NULL, so the guard requires its user to exist.
--   admin_notices.link '/admin/users/<int>' -> '/admin/users/<uuid>' (NULL when that user no longer exists).
-- Not touched: guest ids (guest_id columns, separate from user_id), referral codes (random, not derived from the id),
-- avatar files (avatars/<old id>-<time>.webp keep their name: the path is stored in users.avatar_path, never rebuilt),
-- deposit codes (random). Refresh tokens keep working: refresh_tokens.user_id is converted in place, so nobody is logged
-- out; access tokens issued before (numeric subject) get 401 and the client renews them through the refresh cookie.
-- Unsubscribe links in mails already sent carry the old numeric id: the new code finds the user from the old id bits
-- kept inside the UUID (see below), so those links keep working.
--
-- BEFORE DEPLOY (mandatory):
--   1. Full backup:  mysqldump --single-transaction --routines --triggers <db> > backup_before_0080.sql
--   2. SELECT VERSION(), @@sql_require_primary_key;   -- the second value must be 0
--   3. No job running: no crawl job RUNNING, no slide analysis QUEUED/RUNNING, no marketing broadcast SENDING:
--        SELECT (SELECT COUNT(*) FROM crawl_jobs WHERE status = 'RUNNING') AS crawl,
--               (SELECT COUNT(*) FROM material_uploads WHERE status IN ('QUEUED', 'RUNNING')) AS slides,
--               (SELECT COUNT(*) FROM marketing_broadcasts WHERE status = 'SENDING') AS broadcasts;   -- all 0
--   4. Stop the API before migrating (pm2 stop fepass-api): the old build writes INT user ids and would fail or race
--      while tables are converted. deploy.sh starts it again after the build. Ship the frontend right after.
--   5. Test this file on a copy of the production dump first (same MySQL version), running the VERIFY queries below.
-- The migration stops by itself before changing anything if an orphan row exists or a user id is >= 2^24 (error 1242
-- "Subquery returns more than 1 row" from the first DO statement): fix the data, run
--   npx prisma migrate resolve --rolled-back 0080_uuid7_user
-- (Prisma records the failed run and refuses to continue with P3009 until then), then deploy again.
-- After ANY restore of the backup taken above, also run: DROP TABLE IF EXISTS _0080_user_ids;
-- (a dump restore does not remove tables created after the dump; step 1 below would fail on it).
--
-- HOW: same pattern as 0079. One mapping table (old INT id as text -> new UUID). Every FK to users is dropped, then each
-- table has all its user columns converted to CHAR(36) by ONE ALTER (ALGORITHM=COPY, a single rebuild per table;
-- primary keys, unique keys and indexes keep their names and column order), then one UPDATE ... JOIN rewrites the values.
-- No column is dropped or renamed (MySQL 8.0.29/8.0.30 corrupted data when `id` was dropped and `new_id` renamed in one
-- ALTER). FKs are re-added with FOREIGN_KEY_CHECKS=0 (in place, no extra rebuild) after a DO guard checks every value
-- was mapped.
--
-- Each user gets a UUID v7 built in SQL from its created_at (ms since epoch, read as stored), version 7, variant 10, then
-- the low 24 bits of the old id ("-7hhh-8lll-": bits 12..23 and 0..11; rows of the same millisecond keep their old order
-- and the value is unique without relying on randomness), then 48 random bits. Text order of the new ids =
-- (created_at, old id) order, so ORDER BY id still means sign-up order. userRepository.findIdByLegacyId relies on the
-- "-7hhh-8lll-" groups to resolve old mail links.
--
-- EXPECTED COST: 41 tables are copied once each (the largest are usually ai_token_usage, user_review_logs,
-- wallet_transactions, exam_attempts, user_question_cards) and every row is updated once (one transaction per table).
-- Writes to a table are blocked while it is copied; keep the API stopped for the whole run. Measured on MySQL 8.0.30
-- (laptop SSD): 20k users, 1.4M rows across the user tables (200k wallet rows, 300k review logs, 300k token usage
-- rows, 60k attempts, 20k rows in each of the other user tables) = about 2.5 minutes.
-- Expect several times longer on a small VPS; size the big tables first:
--   SELECT table_name, table_rows, ROUND((data_length+index_length)/1048576) AS mb FROM information_schema.tables
--   WHERE table_schema = DATABASE() ORDER BY data_length DESC LIMIT 10;
--
-- VERIFY money and ownership (run before and after; every value must be identical). The checksums join each row to
-- its owner's email, so they only stay equal if every row still belongs to the same person. Only the last row
-- (admin user links) may drop, by the links to users that no longer exist:
--   SELECT 'users', COUNT(*), SUM(balance), SUM(CRC32(CONCAT_WS(':', u.email, u.balance, r.email))) FROM users u LEFT JOIN users r ON r.id = u.referred_by_id
--   UNION ALL SELECT 'wallet_transactions', COUNT(*), SUM(w.amount) + SUM(w.balance_after), SUM(CRC32(CONCAT_WS(':', u.email, w.type, w.amount, w.balance_after, w.created_at))) FROM wallet_transactions w JOIN users u ON u.id = w.user_id
--   UNION ALL SELECT 'credit_lots', COUNT(*), SUM(c.amount) + SUM(c.remaining), SUM(CRC32(CONCAT_WS(':', u.email, c.amount, c.remaining, c.expires_at))) FROM credit_lots c JOIN users u ON u.id = c.user_id
--   UNION ALL SELECT 'deposit_orders', COUNT(*), SUM(d.amount), SUM(CRC32(CONCAT_WS(':', u.email, d.code, d.amount, d.status))) FROM deposit_orders d JOIN users u ON u.id = d.user_id
--   UNION ALL SELECT 'plan_purchases', COUNT(*), SUM(p.price), SUM(CRC32(CONCAT_WS(':', u.email, p.plan, p.price, p.created_at))) FROM plan_purchases p JOIN users u ON u.id = p.user_id
--   UNION ALL SELECT 'coursera_orders', COUNT(*), SUM(o.amount), SUM(CRC32(CONCAT_WS(':', u.email, o.id, o.amount, o.status))) FROM coursera_orders o JOIN users u ON u.id = o.user_id
--   UNION ALL SELECT 'referral_rewards', COUNT(*), SUM(x.amount), SUM(CRC32(CONCAT_WS(':', a.email, b.email, x.type, x.amount))) FROM referral_rewards x JOIN users a ON a.id = x.referrer_id JOIN users b ON b.id = x.referred_id
--   UNION ALL SELECT 'refresh_tokens', COUNT(*), 0, SUM(CRC32(CONCAT_WS(':', u.email, t.token_hash))) FROM refresh_tokens t JOIN users u ON u.id = t.user_id
--   UNION ALL SELECT 'gift_code_redemptions', COUNT(*), SUM(g.amount), SUM(CRC32(CONCAT_WS(':', u.email, g.gift_code_id))) FROM gift_code_redemptions g JOIN users u ON u.id = g.user_id
--   UNION ALL SELECT 'exam_attempts', COUNT(*), 0, SUM(CRC32(CONCAT_WS(':', u.email, a.id))) FROM exam_attempts a JOIN users u ON u.id = a.user_id
--   UNION ALL SELECT 'user_exams', COUNT(*), COUNT(e.user_id), SUM(CRC32(CONCAT_WS(':', u.email, e.exam_id, e.guest_id))) FROM user_exams e LEFT JOIN users u ON u.id = e.user_id
--   UNION ALL SELECT 'admin_notices user links', COUNT(*), 0, 0 FROM admin_notices WHERE link LIKE '/admin/users/%';
-- VERIFY row counts (before and after, equal; the five "with user/creator" soft counts may drop by the number of
-- values whose user no longer exists, which become NULL):
--   SELECT 'ai_token_usage', COUNT(*) FROM ai_token_usage UNION ALL SELECT 'answer_reports', COUNT(*) FROM answer_reports
--   UNION ALL SELECT 'daily_check_ins', COUNT(*) FROM daily_check_ins UNION ALL SELECT 'email_campaign_logs', COUNT(*) FROM email_campaign_logs
--   UNION ALL SELECT 'email_verification_tokens', COUNT(*) FROM email_verification_tokens UNION ALL SELECT 'explain_chat_usage', COUNT(*) FROM explain_chat_usage
--   UNION ALL SELECT 'explanation_feedback', COUNT(*) FROM explanation_feedback UNION ALL SELECT 'explanation_purchases', COUNT(*) FROM explanation_purchases
--   UNION ALL SELECT 'explanation_unlocks', COUNT(*) FROM explanation_unlocks UNION ALL SELECT 'free_explain_turns', COUNT(*) FROM free_explain_turns
--   UNION ALL SELECT 'link_reward_requests', COUNT(*) FROM link_reward_requests UNION ALL SELECT 'material_uploads', COUNT(*) FROM material_uploads
--   UNION ALL SELECT 'password_reset_tokens', COUNT(*) FROM password_reset_tokens UNION ALL SELECT 'pe_downloads', COUNT(*) FROM pe_downloads
--   UNION ALL SELECT 'practice_sessions with user', COUNT(user_id) FROM practice_sessions UNION ALL SELECT 'pro_tickets', COUNT(*) FROM pro_tickets
--   UNION ALL SELECT 'prompt_events', COUNT(*) FROM prompt_events UNION ALL SELECT 'review_items', COUNT(*) FROM review_items
--   UNION ALL SELECT 'saved_questions', COUNT(*) FROM saved_questions UNION ALL SELECT 'study_days', COUNT(*) FROM study_days
--   UNION ALL SELECT 'user_exam_slots', COUNT(*) FROM user_exam_slots UNION ALL SELECT 'user_grade_settings', COUNT(*) FROM user_grade_settings
--   UNION ALL SELECT 'user_grades', COUNT(*) FROM user_grades UNION ALL SELECT 'user_question_cards', COUNT(*) FROM user_question_cards
--   UNION ALL SELECT 'user_review_logs', COUNT(*) FROM user_review_logs UNION ALL SELECT 'chat_logs with user', COUNT(user_id) FROM chat_logs
--   UNION ALL SELECT 'crawl_jobs with user', COUNT(user_id) FROM crawl_jobs UNION ALL SELECT 'admin_notices with user', COUNT(user_id) FROM admin_notices
--   UNION ALL SELECT 'exams with creator', COUNT(created_by_id) FROM exams UNION ALL SELECT 'marketing_broadcasts', COUNT(*) FROM marketing_broadcasts;
-- VERIFY after (every row must be 0): no orphan and no value left unconverted
--   SELECT 'orphans', (SELECT COUNT(*) FROM users c LEFT JOIN users e ON e.id = c.referred_by_id WHERE c.referred_by_id IS NOT NULL AND e.id IS NULL)
--     + (SELECT COUNT(*) FROM wallet_transactions c LEFT JOIN users e ON e.id = c.user_id WHERE e.id IS NULL)
--     + (SELECT COUNT(*) FROM credit_lots c LEFT JOIN users e ON e.id = c.user_id WHERE e.id IS NULL)
--     + (SELECT COUNT(*) FROM deposit_orders c LEFT JOIN users e ON e.id = c.user_id WHERE e.id IS NULL)
--     + (SELECT COUNT(*) FROM refresh_tokens c LEFT JOIN users e ON e.id = c.user_id WHERE e.id IS NULL)
--     + (SELECT COUNT(*) FROM referral_rewards c LEFT JOIN users a ON a.id = c.referrer_id LEFT JOIN users b ON b.id = c.referred_id WHERE a.id IS NULL OR b.id IS NULL)
--   UNION ALL SELECT 'non-uuid user ids', COUNT(*) FROM users WHERE CHAR_LENGTH(id) <> 36
--   UNION ALL SELECT 'old admin links', COUNT(*) FROM admin_notices WHERE link REGEXP '^/admin/users/[0-9]+$';
--   (the same LEFT JOIN check works for any other table in the list above)
--
-- ROLLBACK: there is no down migration. Restore the mysqldump taken above (it also restores `_prisma_migrations`
-- without this migration) and redeploy the previous backend AND frontend builds (the new frontend expects string ids).
-- Sessions created after the deploy are lost by the restore (users log in again). MySQL DDL is not transactional: if
-- this migration fails half-way, do NOT re-run it on top of the partial state; restore the backup, fix, then deploy again.
-- =====================================================================================================================

-- ---------------------------------------------------------------------------------------------------------------------
-- 0. Guard, before any change: no orphan row may exist (each branch returns a row only on a problem; any extra row makes
--    the scalar subquery fail with error 1242 and the migration stops untouched). Also old ids must fit in 24 bits.
-- ---------------------------------------------------------------------------------------------------------------------
DO (SELECT 1
  UNION ALL (SELECT 1 FROM `users` WHERE `id` >= 16777216 LIMIT 1)
  UNION ALL (SELECT 1 FROM `users` c LEFT JOIN `users` e ON e.`id` = c.`referred_by_id` WHERE c.`referred_by_id` IS NOT NULL AND e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `ai_token_usage` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `answer_reports` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `coursera_orders` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `credit_lots` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `daily_check_ins` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `deposit_orders` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `email_campaign_logs` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `email_verification_tokens` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `exam_attempts` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `explain_chat_usage` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `explanation_feedback` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `explanation_purchases` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `explanation_unlocks` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `free_explain_turns` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `gift_code_redemptions` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `link_reward_requests` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `material_uploads` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `password_reset_tokens` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `pe_downloads` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `plan_purchases` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `practice_sessions` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE c.`user_id` IS NOT NULL AND e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `pro_tickets` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `prompt_events` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `refresh_tokens` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `review_items` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `saved_questions` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `study_days` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `user_exam_slots` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `user_exams` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE c.`user_id` IS NOT NULL AND e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `user_grade_settings` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `user_grades` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `user_question_cards` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `user_review_logs` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `wallet_transactions` c LEFT JOIN `users` e ON e.`id` = c.`user_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `referral_rewards` c LEFT JOIN `users` e ON e.`id` = c.`referrer_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `referral_rewards` c LEFT JOIN `users` e ON e.`id` = c.`referred_id` WHERE e.`id` IS NULL LIMIT 1)
  UNION ALL (SELECT 1 FROM `marketing_broadcasts` c LEFT JOIN `users` e ON e.`id` = c.`created_by_id` WHERE e.`id` IS NULL LIMIT 1)
);

-- ---------------------------------------------------------------------------------------------------------------------
-- 1. Mapping table: old INT id (as text, to join the converted CHAR columns through the primary key) -> UUID v7.
--    Layout: 12 hex ms | '7' + 3 hex (old id bits 12..23) | '8' + 3 hex (old id bits 0..11) | 12 hex random
-- ---------------------------------------------------------------------------------------------------------------------
CREATE TABLE `_0080_user_ids` (
  `old_id` VARCHAR(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `new_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`old_id`),
  UNIQUE INDEX `_0080_user_ids_new_id_key`(`new_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `_0080_user_ids` (`old_id`, `new_id`)
SELECT CAST(`id` AS CHAR), LOWER(CONCAT_WS('-',
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 1, 8),
  SUBSTRING(LPAD(HEX(TIMESTAMPDIFF(MICROSECOND, '1970-01-01 00:00:00', `created_at`) DIV 1000), 12, '0'), 9, 4),
  CONCAT('7', LPAD(HEX((`id` >> 12) & 4095), 3, '0')),
  CONCAT('8', LPAD(HEX(`id` & 4095), 3, '0')),
  HEX(RANDOM_BYTES(6))))
FROM `users`;

-- ---------------------------------------------------------------------------------------------------------------------
-- 2. Drop every foreign key that points at users.id (metadata only; the indexes stay and are reused in step 7).
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE `ai_token_usage` DROP FOREIGN KEY `ai_token_usage_user_id_fkey`;
ALTER TABLE `answer_reports` DROP FOREIGN KEY `answer_reports_user_id_fkey`;
ALTER TABLE `coursera_orders` DROP FOREIGN KEY `coursera_orders_user_id_fkey`;
ALTER TABLE `credit_lots` DROP FOREIGN KEY `credit_lots_user_id_fkey`;
ALTER TABLE `daily_check_ins` DROP FOREIGN KEY `daily_check_ins_user_id_fkey`;
ALTER TABLE `deposit_orders` DROP FOREIGN KEY `deposit_orders_user_id_fkey`;
ALTER TABLE `email_campaign_logs` DROP FOREIGN KEY `email_campaign_logs_user_id_fkey`;
ALTER TABLE `email_verification_tokens` DROP FOREIGN KEY `email_verification_tokens_user_id_fkey`;
ALTER TABLE `exam_attempts` DROP FOREIGN KEY `exam_attempts_user_id_fkey`;
ALTER TABLE `explain_chat_usage` DROP FOREIGN KEY `explain_chat_usage_user_id_fkey`;
ALTER TABLE `explanation_feedback` DROP FOREIGN KEY `explanation_feedback_user_id_fkey`;
ALTER TABLE `explanation_purchases` DROP FOREIGN KEY `explanation_purchases_user_id_fkey`;
ALTER TABLE `explanation_unlocks` DROP FOREIGN KEY `explanation_unlocks_user_id_fkey`;
ALTER TABLE `free_explain_turns` DROP FOREIGN KEY `free_explain_turns_user_id_fkey`;
ALTER TABLE `gift_code_redemptions` DROP FOREIGN KEY `gift_code_redemptions_user_id_fkey`;
ALTER TABLE `link_reward_requests` DROP FOREIGN KEY `link_reward_requests_user_id_fkey`;
ALTER TABLE `material_uploads` DROP FOREIGN KEY `material_uploads_user_id_fkey`;
ALTER TABLE `password_reset_tokens` DROP FOREIGN KEY `password_reset_tokens_user_id_fkey`;
ALTER TABLE `pe_downloads` DROP FOREIGN KEY `pe_downloads_user_id_fkey`;
ALTER TABLE `plan_purchases` DROP FOREIGN KEY `plan_purchases_user_id_fkey`;
ALTER TABLE `practice_sessions` DROP FOREIGN KEY `practice_sessions_user_id_fkey`;
ALTER TABLE `pro_tickets` DROP FOREIGN KEY `pro_tickets_user_id_fkey`;
ALTER TABLE `prompt_events` DROP FOREIGN KEY `prompt_events_user_id_fkey`;
ALTER TABLE `refresh_tokens` DROP FOREIGN KEY `refresh_tokens_user_id_fkey`;
ALTER TABLE `review_items` DROP FOREIGN KEY `review_items_user_id_fkey`;
ALTER TABLE `saved_questions` DROP FOREIGN KEY `saved_questions_user_id_fkey`;
ALTER TABLE `study_days` DROP FOREIGN KEY `study_days_user_id_fkey`;
ALTER TABLE `user_exam_slots` DROP FOREIGN KEY `user_exam_slots_user_id_fkey`;
ALTER TABLE `user_exams` DROP FOREIGN KEY `user_exams_user_id_fkey`;
ALTER TABLE `user_grade_settings` DROP FOREIGN KEY `user_grade_settings_user_id_fkey`;
ALTER TABLE `user_grades` DROP FOREIGN KEY `user_grades_user_id_fkey`;
ALTER TABLE `user_question_cards` DROP FOREIGN KEY `user_question_cards_user_id_fkey`;
ALTER TABLE `user_review_logs` DROP FOREIGN KEY `user_review_logs_user_id_fkey`;
ALTER TABLE `wallet_transactions` DROP FOREIGN KEY `wallet_transactions_user_id_fkey`;
ALTER TABLE `referral_rewards` DROP FOREIGN KEY `referral_rewards_referrer_id_fkey`;
ALTER TABLE `referral_rewards` DROP FOREIGN KEY `referral_rewards_referred_id_fkey`;
ALTER TABLE `users` DROP FOREIGN KEY `users_referred_by_id_fkey`;

-- ---------------------------------------------------------------------------------------------------------------------
-- 3. users: convert in place (one rebuild; the primary key is kept, AUTO_INCREMENT goes away), then rewrite.
--    INT -> CHAR keeps the value as text ('123'), which is what the mapping table joins on.
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE `users`
  MODIFY `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  MODIFY `referred_by_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  ALGORITHM=COPY;
UPDATE `users` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`id` LEFT JOIN `_0080_user_ids` r ON r.`old_id` = t.`referred_by_id`
  SET t.`id` = m.`new_id`, t.`referred_by_id` = r.`new_id`;

-- ---------------------------------------------------------------------------------------------------------------------
-- 4. Tables with a FK to users: every user column of the table in ONE ALTER (one rebuild each, indexes and composite
--    unique/primary keys keep their names), then one UPDATE. Secondary admin columns (reviewed/resolved/viewed by) have no
--    FK: a value whose user is gone becomes NULL.
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE `ai_token_usage` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `ai_token_usage` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `answer_reports` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, MODIFY `reviewed_by_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, MODIFY `resolved_by_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=COPY;
UPDATE `answer_reports` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` LEFT JOIN `_0080_user_ids` x0 ON x0.`old_id` = t.`reviewed_by_id` LEFT JOIN `_0080_user_ids` x1 ON x1.`old_id` = t.`resolved_by_id` SET t.`user_id` = m.`new_id`, t.`reviewed_by_id` = x0.`new_id`, t.`resolved_by_id` = x1.`new_id`;

ALTER TABLE `coursera_orders` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, MODIFY `credential_viewed_by` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=COPY;
UPDATE `coursera_orders` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` LEFT JOIN `_0080_user_ids` x0 ON x0.`old_id` = t.`credential_viewed_by` SET t.`user_id` = m.`new_id`, t.`credential_viewed_by` = x0.`new_id`;

ALTER TABLE `credit_lots` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `credit_lots` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `daily_check_ins` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `daily_check_ins` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `deposit_orders` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `deposit_orders` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `email_campaign_logs` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `email_campaign_logs` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `email_verification_tokens` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `email_verification_tokens` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `exam_attempts` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `exam_attempts` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `explain_chat_usage` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `explain_chat_usage` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `explanation_feedback` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, MODIFY `resolved_by_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=COPY;
UPDATE `explanation_feedback` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` LEFT JOIN `_0080_user_ids` x0 ON x0.`old_id` = t.`resolved_by_id` SET t.`user_id` = m.`new_id`, t.`resolved_by_id` = x0.`new_id`;

ALTER TABLE `explanation_purchases` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `explanation_purchases` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `explanation_unlocks` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `explanation_unlocks` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `free_explain_turns` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `free_explain_turns` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `gift_code_redemptions` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `gift_code_redemptions` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `link_reward_requests` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `link_reward_requests` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `material_uploads` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `material_uploads` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `password_reset_tokens` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `password_reset_tokens` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `pe_downloads` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `pe_downloads` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `plan_purchases` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `plan_purchases` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `practice_sessions` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=COPY;
UPDATE `practice_sessions` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `pro_tickets` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `pro_tickets` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `prompt_events` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `prompt_events` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `refresh_tokens` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `refresh_tokens` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `review_items` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `review_items` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `saved_questions` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `saved_questions` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `study_days` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `study_days` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `user_exam_slots` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `user_exam_slots` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `user_exams` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=COPY;
UPDATE `user_exams` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `user_grade_settings` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `user_grade_settings` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `user_grades` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `user_grades` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `user_question_cards` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `user_question_cards` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `user_review_logs` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `user_review_logs` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `wallet_transactions` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `wallet_transactions` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id`;

ALTER TABLE `referral_rewards` MODIFY `referrer_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, MODIFY `referred_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `referral_rewards` t JOIN `_0080_user_ids` a ON a.`old_id` = t.`referrer_id` JOIN `_0080_user_ids` b ON b.`old_id` = t.`referred_id`
  SET t.`referrer_id` = a.`new_id`, t.`referred_id` = b.`new_id`;

-- ---------------------------------------------------------------------------------------------------------------------
-- 5. Soft references (no FK). A value whose user no longer exists becomes NULL (marketing_broadcasts: guarded in step 0).
-- ---------------------------------------------------------------------------------------------------------------------
ALTER TABLE `admin_notices` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=COPY;
UPDATE `admin_notices` t LEFT JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id` WHERE t.`user_id` IS NOT NULL;

ALTER TABLE `chat_logs` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=COPY;
UPDATE `chat_logs` t LEFT JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id` WHERE t.`user_id` IS NOT NULL;

ALTER TABLE `crawl_jobs` MODIFY `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=COPY;
UPDATE `crawl_jobs` t LEFT JOIN `_0080_user_ids` m ON m.`old_id` = t.`user_id` SET t.`user_id` = m.`new_id` WHERE t.`user_id` IS NOT NULL;

ALTER TABLE `exams` MODIFY `created_by_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, ALGORITHM=COPY;
UPDATE `exams` t LEFT JOIN `_0080_user_ids` m ON m.`old_id` = t.`created_by_id` SET t.`created_by_id` = m.`new_id` WHERE t.`created_by_id` IS NOT NULL;

ALTER TABLE `marketing_broadcasts` MODIFY `created_by_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ALGORITHM=COPY;
UPDATE `marketing_broadcasts` t JOIN `_0080_user_ids` m ON m.`old_id` = t.`created_by_id` SET t.`created_by_id` = m.`new_id`;

-- Admin notices link to /admin/users/<id> (user.registered). '/admin/users/' is 13 chars.
UPDATE `admin_notices` n JOIN `_0080_user_ids` m ON m.`old_id` = SUBSTRING(n.`link`, 14)
  SET n.`link` = CONCAT('/admin/users/', m.`new_id`) WHERE n.`link` LIKE '/admin/users/%';
-- A link to a user that no longer exists leads nowhere: drop it.
UPDATE `admin_notices` SET `link` = NULL WHERE `link` REGEXP '^/admin/users/[0-9]+$';

-- ---------------------------------------------------------------------------------------------------------------------
-- 6. Guard: every converted value must now be a 36-char UUID (stops before re-adding FKs without checks).
-- ---------------------------------------------------------------------------------------------------------------------

DO (SELECT 1
  UNION ALL (SELECT 1 FROM `users` WHERE CHAR_LENGTH(`id`) <> 36 OR CHAR_LENGTH(`referred_by_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `ai_token_usage` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `answer_reports` WHERE CHAR_LENGTH(`user_id`) <> 36 OR CHAR_LENGTH(`reviewed_by_id`) <> 36 OR CHAR_LENGTH(`resolved_by_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `coursera_orders` WHERE CHAR_LENGTH(`user_id`) <> 36 OR CHAR_LENGTH(`credential_viewed_by`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `credit_lots` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `daily_check_ins` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `deposit_orders` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `email_campaign_logs` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `email_verification_tokens` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `exam_attempts` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `explain_chat_usage` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `explanation_feedback` WHERE CHAR_LENGTH(`user_id`) <> 36 OR CHAR_LENGTH(`resolved_by_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `explanation_purchases` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `explanation_unlocks` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `free_explain_turns` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `gift_code_redemptions` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `link_reward_requests` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `material_uploads` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `password_reset_tokens` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `pe_downloads` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `plan_purchases` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `practice_sessions` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `pro_tickets` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `prompt_events` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `refresh_tokens` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `review_items` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `saved_questions` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `study_days` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `user_exam_slots` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `user_exams` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `user_grade_settings` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `user_grades` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `user_question_cards` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `user_review_logs` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `wallet_transactions` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `referral_rewards` WHERE CHAR_LENGTH(`referrer_id`) <> 36 OR CHAR_LENGTH(`referred_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `admin_notices` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `chat_logs` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `crawl_jobs` WHERE CHAR_LENGTH(`user_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `exams` WHERE CHAR_LENGTH(`created_by_id`) <> 36 LIMIT 1)
  UNION ALL (SELECT 1 FROM `marketing_broadcasts` WHERE CHAR_LENGTH(`created_by_id`) <> 36 LIMIT 1)
);

-- ---------------------------------------------------------------------------------------------------------------------
-- 7. Recreate the foreign keys with the same names and actions as before.
-- ---------------------------------------------------------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;
ALTER TABLE `users` ADD CONSTRAINT `users_referred_by_id_fkey` FOREIGN KEY (`referred_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `ai_token_usage` ADD CONSTRAINT `ai_token_usage_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `answer_reports` ADD CONSTRAINT `answer_reports_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `coursera_orders` ADD CONSTRAINT `coursera_orders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `credit_lots` ADD CONSTRAINT `credit_lots_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `daily_check_ins` ADD CONSTRAINT `daily_check_ins_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `deposit_orders` ADD CONSTRAINT `deposit_orders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `email_campaign_logs` ADD CONSTRAINT `email_campaign_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `email_verification_tokens` ADD CONSTRAINT `email_verification_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `exam_attempts` ADD CONSTRAINT `exam_attempts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `explain_chat_usage` ADD CONSTRAINT `explain_chat_usage_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `explanation_feedback` ADD CONSTRAINT `explanation_feedback_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `explanation_purchases` ADD CONSTRAINT `explanation_purchases_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `explanation_unlocks` ADD CONSTRAINT `explanation_unlocks_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `free_explain_turns` ADD CONSTRAINT `free_explain_turns_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `gift_code_redemptions` ADD CONSTRAINT `gift_code_redemptions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `link_reward_requests` ADD CONSTRAINT `link_reward_requests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `material_uploads` ADD CONSTRAINT `material_uploads_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `pe_downloads` ADD CONSTRAINT `pe_downloads_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `plan_purchases` ADD CONSTRAINT `plan_purchases_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `practice_sessions` ADD CONSTRAINT `practice_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `pro_tickets` ADD CONSTRAINT `pro_tickets_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `prompt_events` ADD CONSTRAINT `prompt_events_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `review_items` ADD CONSTRAINT `review_items_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `saved_questions` ADD CONSTRAINT `saved_questions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `study_days` ADD CONSTRAINT `study_days_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `user_exam_slots` ADD CONSTRAINT `user_exam_slots_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `user_exams` ADD CONSTRAINT `user_exams_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `user_grade_settings` ADD CONSTRAINT `user_grade_settings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `user_grades` ADD CONSTRAINT `user_grades_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `user_question_cards` ADD CONSTRAINT `user_question_cards_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `user_review_logs` ADD CONSTRAINT `user_review_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `referral_rewards` ADD CONSTRAINT `referral_rewards_referrer_id_fkey` FOREIGN KEY (`referrer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
ALTER TABLE `referral_rewards` ADD CONSTRAINT `referral_rewards_referred_id_fkey` FOREIGN KEY (`referred_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ALGORITHM=INPLACE;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------------------------------------------------
-- 8. Clean up the mapping table.
-- ---------------------------------------------------------------------------------------------------------------------
DROP TABLE `_0080_user_ids`;
