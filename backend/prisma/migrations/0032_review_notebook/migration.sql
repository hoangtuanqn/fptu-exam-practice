-- AlterTable
ALTER TABLE `users` ADD COLUMN `study_goal_days` INTEGER NOT NULL DEFAULT 3;

-- CreateTable
CREATE TABLE `review_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `exam_id` INTEGER NOT NULL,
    `question_number` INTEGER NOT NULL,
    `box` INTEGER NOT NULL DEFAULT 1,
    `next_review_at` DATETIME(3) NOT NULL,
    `wrong_count` INTEGER NOT NULL DEFAULT 1,
    `doubtful` BOOLEAN NOT NULL DEFAULT false,
    `mastered` BOOLEAN NOT NULL DEFAULT false,
    `last_reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `review_items_user_id_mastered_next_review_at_idx`(`user_id`, `mastered`, `next_review_at`),
    UNIQUE INDEX `review_items_user_id_exam_id_question_number_key`(`user_id`, `exam_id`, `question_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `study_days` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `day` DATE NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `reviews` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `study_days_user_id_day_key`(`user_id`, `day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `review_items` ADD CONSTRAINT `review_items_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review_items` ADD CONSTRAINT `review_items_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `study_days` ADD CONSTRAINT `study_days_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
