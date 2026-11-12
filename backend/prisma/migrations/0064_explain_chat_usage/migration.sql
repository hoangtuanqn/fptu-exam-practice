-- AI chat about an explained question: per-user message counter per Vietnam calendar day (daily quota).
-- Additive: one new table, no change to existing data.
CREATE TABLE `explain_chat_usage` (
    `user_id` INTEGER NOT NULL,
    `day` DATE NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`user_id`, `day`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `explain_chat_usage` ADD CONSTRAINT `explain_chat_usage_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
