-- Post-moderated comments (decision 0019): why a comment was held, comment likes and reports, question likes and answer votes.
-- Additive: one nullable column and two indexes on exam_comments, four new tables. Applies after 0095.

-- AlterTable
ALTER TABLE `exam_comments` ADD COLUMN `flag_reason` VARCHAR(20) NULL;

-- CreateTable
CREATE TABLE `exam_comment_likes` (
    `comment_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `exam_comment_likes_user_id_idx`(`user_id`),
    PRIMARY KEY (`comment_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_comment_reports` (
    `comment_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `reason` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `exam_comment_reports_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`comment_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_question_likes` (
    `exam_id` CHAR(36) NOT NULL,
    `question_number` INTEGER NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `exam_question_likes_user_id_idx`(`user_id`),
    PRIMARY KEY (`exam_id`, `question_number`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_question_votes` (
    `exam_id` CHAR(36) NOT NULL,
    `question_number` INTEGER NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `answers` VARCHAR(20) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `exam_question_votes_user_id_idx`(`user_id`),
    PRIMARY KEY (`exam_id`, `question_number`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `exam_comments_user_id_exam_id_question_number_created_at_idx` ON `exam_comments`(`user_id`, `exam_id`, `question_number`, `created_at`);

-- CreateIndex
CREATE INDEX `exam_comments_user_id_status_reviewed_at_idx` ON `exam_comments`(`user_id`, `status`, `reviewed_at`);

-- AddForeignKey
ALTER TABLE `exam_comment_likes` ADD CONSTRAINT `exam_comment_likes_comment_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `exam_comments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_comment_likes` ADD CONSTRAINT `exam_comment_likes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_comment_reports` ADD CONSTRAINT `exam_comment_reports_comment_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `exam_comments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_comment_reports` ADD CONSTRAINT `exam_comment_reports_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_question_likes` ADD CONSTRAINT `exam_question_likes_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_question_likes` ADD CONSTRAINT `exam_question_likes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_question_votes` ADD CONSTRAINT `exam_question_votes_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_question_votes` ADD CONSTRAINT `exam_question_votes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

