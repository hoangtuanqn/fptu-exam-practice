-- FSRS spaced-repetition state per user and question plus a log of every review (ts-fsrs). Separate from the Leitner review_items.
-- Additive: two new tables.
CREATE TABLE `user_question_cards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `question_id` INTEGER NOT NULL,
    `due` DATETIME(3) NOT NULL,
    `stability` DOUBLE NOT NULL,
    `difficulty` DOUBLE NOT NULL,
    `elapsed_days` INTEGER NOT NULL,
    `scheduled_days` INTEGER NOT NULL,
    `learning_steps` INTEGER NOT NULL,
    `reps` INTEGER NOT NULL,
    `lapses` INTEGER NOT NULL,
    `state` TINYINT NOT NULL,
    `last_review` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_question_cards_user_id_question_id_key`(`user_id`, `question_id`),
    INDEX `user_question_cards_user_id_due_idx`(`user_id`, `due`),
    INDEX `user_question_cards_question_id_idx`(`question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `user_review_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `question_id` INTEGER NOT NULL,
    `rating` TINYINT NOT NULL,
    `state` TINYINT NOT NULL,
    `due` DATETIME(3) NOT NULL,
    `stability` DOUBLE NOT NULL,
    `difficulty` DOUBLE NOT NULL,
    `elapsed_days` INTEGER NOT NULL,
    `last_elapsed_days` INTEGER NOT NULL,
    `scheduled_days` INTEGER NOT NULL,
    `learning_steps` INTEGER NOT NULL,
    `reviewed_at` DATETIME(3) NOT NULL,

    INDEX `user_review_logs_user_id_reviewed_at_idx`(`user_id`, `reviewed_at`),
    INDEX `user_review_logs_question_id_idx`(`question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_question_cards` ADD CONSTRAINT `user_question_cards_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_question_cards` ADD CONSTRAINT `user_question_cards_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `exam_questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_review_logs` ADD CONSTRAINT `user_review_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_review_logs` ADD CONSTRAINT `user_review_logs_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `exam_questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
