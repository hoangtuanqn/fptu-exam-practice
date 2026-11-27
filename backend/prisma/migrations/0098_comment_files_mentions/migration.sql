-- Comment attachments and mentions (decision 0020).
-- Additive: two new tables with cascade foreign keys and one index on exam_comments. Applies after 0097.

-- CreateTable
CREATE TABLE `exam_comment_files` (
    `id` CHAR(36) NOT NULL,
    `comment_id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(255) NOT NULL,
    `mime` VARCHAR(100) NOT NULL,
    `size_bytes` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `exam_comment_files_comment_id_idx`(`comment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_comment_mentions` (
    `comment_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `notified_at` DATETIME(3) NULL,

    INDEX `exam_comment_mentions_user_id_idx`(`user_id`),
    PRIMARY KEY (`comment_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `exam_comments_exam_id_status_user_id_idx` ON `exam_comments`(`exam_id`, `status`, `user_id`);

-- AddForeignKey
ALTER TABLE `exam_comment_files` ADD CONSTRAINT `exam_comment_files_comment_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `exam_comments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_comment_mentions` ADD CONSTRAINT `exam_comment_mentions_comment_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `exam_comments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_comment_mentions` ADD CONSTRAINT `exam_comment_mentions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
