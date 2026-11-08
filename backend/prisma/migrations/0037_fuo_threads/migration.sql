-- CreateTable
CREATE TABLE `fuo_threads` (
    `thread_id` VARCHAR(20) NOT NULL,
    `subject_code` VARCHAR(20) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `posted_at` DATETIME(3) NULL,
    `replies` INTEGER NOT NULL DEFAULT 0,
    `synced_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fuo_threads_subject_code_posted_at_idx`(`subject_code`, `posted_at`),
    PRIMARY KEY (`thread_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
