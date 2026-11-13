-- Thumbs up/down on an AI explanation (one rating per user per question, overwritten when the user changes their mind).
-- Additive: one new table, no change to existing data.
CREATE TABLE `explanation_feedback` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `exam_id` INTEGER NOT NULL,
    `question_number` INTEGER NOT NULL,
    `helpful` BOOLEAN NOT NULL,
    `reason` VARCHAR(20) NULL,
    `comment` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `explanation_feedback_helpful_updated_at_idx`(`helpful`, `updated_at`),
    INDEX `explanation_feedback_exam_id_question_number_idx`(`exam_id`, `question_number`),
    UNIQUE INDEX `explanation_feedback_user_id_exam_id_question_number_key`(`user_id`, `exam_id`, `question_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `explanation_feedback` ADD CONSTRAINT `explanation_feedback_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `explanation_feedback` ADD CONSTRAINT `explanation_feedback_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
