-- Manual marketing broadcasts (admin "send manually"): one row per broadcast, sent through the daily marketing run.
-- Additive: one new table. email_campaign_logs.campaign is widened from VARCHAR(20) to VARCHAR(40) so `broadcast:<id>` always fits
-- (in-place widening, existing values unchanged). sending_lock is 1 only while SENDING; the unique index allows one SENDING broadcast.
CREATE TABLE `marketing_broadcasts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subject` VARCHAR(120) NOT NULL,
    `body` TEXT NOT NULL,
    `cta_label` VARCHAR(40) NOT NULL,
    `cta_path` VARCHAR(120) NOT NULL,
    `segment` VARCHAR(20) NOT NULL,
    `segment_days` INTEGER NULL,
    `status` ENUM('DRAFT', 'SENDING', 'DONE', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `sending_lock` BOOLEAN NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `marketing_broadcasts_sending_lock_key`(`sending_lock`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `email_campaign_logs` MODIFY `campaign` VARCHAR(40) NOT NULL;
