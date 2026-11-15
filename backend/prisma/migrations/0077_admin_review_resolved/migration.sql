-- Admin can mark an answer report or a "not helpful" AI rating as handled. Existing rows stay unresolved (NULL).
-- Columns first (INSTANT on MySQL 8, no table rebuild), then the indexes that keep the sidebar pending counts cheap.
ALTER TABLE `answer_reports`
  ADD COLUMN `resolved_at` DATETIME(3) NULL,
  ADD COLUMN `resolved_by_id` INTEGER NULL;
ALTER TABLE `answer_reports`
  ADD INDEX `answer_reports_status_resolved_at_idx`(`status`, `resolved_at`);

ALTER TABLE `explanation_feedback`
  ADD COLUMN `resolved_at` DATETIME(3) NULL,
  ADD COLUMN `resolved_by_id` INTEGER NULL;
ALTER TABLE `explanation_feedback`
  ADD INDEX `explanation_feedback_helpful_resolved_at_updated_at_idx`(`helpful`, `resolved_at`, `updated_at`);
