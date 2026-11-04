-- CreateTable
CREATE TABLE `practice_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `guest_id` VARCHAR(64) NULL,
    `exam_id` INTEGER NOT NULL,
    `mode` ENUM('PRACTICE', 'EXAM') NOT NULL,
    `status` ENUM('IN_PROGRESS', 'SUBMITTED') NOT NULL DEFAULT 'IN_PROGRESS',
    `answers` JSON NOT NULL,
    `checked` JSON NOT NULL,
    `flagged` JSON NOT NULL,
    `current` INTEGER NOT NULL DEFAULT 0,
    `elapsed_sec` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `practice_sessions_user_id_status_updated_at_idx`(`user_id`, `status`, `updated_at`),
    INDEX `practice_sessions_guest_id_status_updated_at_idx`(`guest_id`, `status`, `updated_at`),
    INDEX `practice_sessions_exam_id_idx`(`exam_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `practice_sessions` ADD CONSTRAINT `practice_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `practice_sessions` ADD CONSTRAINT `practice_sessions_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
