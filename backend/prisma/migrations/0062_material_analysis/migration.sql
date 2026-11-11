-- Slide analysis (Pro): uploaded slide PDFs, their extracted pages and per-chapter summaries, plus a generic AI token ledger
-- used for the rolling-window token limit. Additive: four new tables.
CREATE TABLE `ai_token_usage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `feature` VARCHAR(30) NOT NULL,
    `input_tokens` INTEGER NOT NULL,
    `output_tokens` INTEGER NOT NULL,
    `total_tokens` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_token_usage_user_id_feature_created_at_idx`(`user_id`, `feature`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `material_uploads` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `subject_id` INTEGER NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `file_hash` CHAR(64) NOT NULL,
    `page_count` INTEGER NOT NULL,
    `status` ENUM('QUEUED', 'RUNNING', 'DONE', 'FAILED') NOT NULL DEFAULT 'QUEUED',
    `error` VARCHAR(500) NULL,
    `progress_done` INTEGER NOT NULL DEFAULT 0,
    `progress_total` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finished_at` DATETIME(3) NULL,
    `expires_at` DATETIME(3) NOT NULL,

    INDEX `material_uploads_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `material_uploads_user_id_file_hash_idx`(`user_id`, `file_hash`),
    INDEX `material_uploads_status_idx`(`status`),
    INDEX `material_uploads_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `material_pages` (
    `upload_id` INTEGER NOT NULL,
    `page_no` INTEGER NOT NULL,
    `kind` VARCHAR(10) NOT NULL,
    `text` TEXT NOT NULL,
    `figure` JSON NULL,
    `assigned` BOOLEAN NOT NULL DEFAULT false,
    `chapter_number` INTEGER NULL,

    PRIMARY KEY (`upload_id`, `page_no`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `material_chapters` (
    `upload_id` INTEGER NOT NULL,
    `chapter_number` INTEGER NOT NULL,
    `summary` TEXT NOT NULL,
    `key_points` JSON NOT NULL,

    PRIMARY KEY (`upload_id`, `chapter_number`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_token_usage` ADD CONSTRAINT `ai_token_usage_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_uploads` ADD CONSTRAINT `material_uploads_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_pages` ADD CONSTRAINT `material_pages_upload_id_fkey` FOREIGN KEY (`upload_id`) REFERENCES `material_uploads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_chapters` ADD CONSTRAINT `material_chapters_upload_id_fkey` FOREIGN KEY (`upload_id`) REFERENCES `material_uploads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
