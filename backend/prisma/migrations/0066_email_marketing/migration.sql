-- Email marketing: opt-out flag and last activity on users, log of automated campaign mails.
-- Additive: new nullable/defaulted columns, one new table, indexes. No change to existing data.
ALTER TABLE `users`
    ADD COLUMN `marketing_opt_out` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `last_active_at` DATETIME(3) NULL;

CREATE INDEX `users_last_active_at_idx` ON `users`(`last_active_at`);

CREATE TABLE `email_campaign_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `campaign` VARCHAR(20) NOT NULL,
    `step` INTEGER NOT NULL,
    `sent_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `email_campaign_logs_user_id_sent_at_idx`(`user_id`, `sent_at`),
    INDEX `email_campaign_logs_campaign_step_idx`(`campaign`, `step`),
    UNIQUE INDEX `email_campaign_logs_user_id_campaign_step_key`(`user_id`, `campaign`, `step`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `email_campaign_logs` ADD CONSTRAINT `email_campaign_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
