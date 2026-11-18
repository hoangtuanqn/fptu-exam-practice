-- Member comments on exam questions, moderated by admins (new rows are PENDING and hidden from other users).
-- Additive: one new table, no change to existing tables. Applies after 0083. reviewed_by_id is a soft reference (no FK).
CREATE TABLE `exam_comments` (
    `id` CHAR(36) NOT NULL,
    `exam_id` CHAR(36) NOT NULL,
    `question_number` INTEGER NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `body` TEXT NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewed_at` DATETIME(3) NULL,
    `reviewed_by_id` CHAR(36) NULL,
    `review_note` VARCHAR(255) NULL,

    INDEX `exam_comments_exam_id_question_number_status_created_at_idx`(`exam_id`, `question_number`, `status`, `created_at`),
    INDEX `exam_comments_status_created_at_idx`(`status`, `created_at`),
    INDEX `exam_comments_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `exam_comments` ADD CONSTRAINT `exam_comments_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_comments` ADD CONSTRAINT `exam_comments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
