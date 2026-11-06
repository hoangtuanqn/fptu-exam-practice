-- CreateTable
CREATE TABLE `kb_chunks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(40) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `content` TEXT NOT NULL,
    `content_hash` VARCHAR(64) NOT NULL,
    `embedding` JSON NULL,
    `model` VARCHAR(60) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `kb_chunks_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `guest_id` VARCHAR(64) NULL,
    `ip` VARCHAR(64) NULL,
    `question` VARCHAR(500) NOT NULL,
    `matched` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_logs_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `chat_logs_guest_id_created_at_idx`(`guest_id`, `created_at`),
    INDEX `chat_logs_ip_created_at_idx`(`ip`, `created_at`),
    INDEX `chat_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
