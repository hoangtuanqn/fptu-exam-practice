-- CreateTable
CREATE TABLE `chat_answer_cache` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `viewer` VARCHAR(10) NOT NULL,
    `question` VARCHAR(500) NOT NULL,
    `embedding` JSON NOT NULL,
    `answer` TEXT NOT NULL,
    `version` VARCHAR(16) NOT NULL,
    `hits` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_answer_cache_version_idx`(`version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `chat_logs` ADD COLUMN `cached` BOOLEAN NOT NULL DEFAULT false;
