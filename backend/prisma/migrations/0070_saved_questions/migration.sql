-- CreateTable
CREATE TABLE `saved_questions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `exam_id` INTEGER NOT NULL,
    `question_number` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `saved_questions_user_id_created_at_idx`(`user_id`, `created_at`),
    UNIQUE INDEX `saved_questions_user_id_exam_id_question_number_key`(`user_id`, `exam_id`, `question_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `saved_questions` ADD CONSTRAINT `saved_questions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saved_questions` ADD CONSTRAINT `saved_questions_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
