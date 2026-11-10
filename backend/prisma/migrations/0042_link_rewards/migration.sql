-- Free AI explanation turns earned by completing a Link4M link (additive: two new tables)
CREATE TABLE `link_reward_requests` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `short_url` VARCHAR(255) NOT NULL,
  `status` VARCHAR(10) NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expires_at` DATETIME(3) NOT NULL,
  `claimed_at` DATETIME(3) NULL,
  UNIQUE INDEX `link_reward_requests_token_hash_key`(`token_hash`),
  INDEX `link_reward_requests_user_id_created_at_idx`(`user_id`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `free_explain_turns` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `request_id` INTEGER NULL,
  `granted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expires_at` DATETIME(3) NOT NULL,
  `used_at` DATETIME(3) NULL,
  `used_exam_id` INTEGER NULL,
  `used_question_number` INTEGER NULL,
  UNIQUE INDEX `free_explain_turns_request_id_key`(`request_id`),
  INDEX `free_explain_turns_user_id_used_at_expires_at_idx`(`user_id`, `used_at`, `expires_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `link_reward_requests` ADD CONSTRAINT `link_reward_requests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `free_explain_turns` ADD CONSTRAINT `free_explain_turns_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `free_explain_turns` ADD CONSTRAINT `free_explain_turns_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `link_reward_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
