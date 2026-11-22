-- Member exam contributions (photos of an exam, no answers), reviewed by admins. Images are files under storage/contributions/<id>/.
-- Additive: one new table, no change to existing tables. Applies after 0086. reviewed_by_id is a soft reference (no FK).
CREATE TABLE `exam_contributions` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `subject_code` VARCHAR(20) NOT NULL,
    `title` VARCHAR(200) NULL,
    `term` VARCHAR(50) NULL,
    `note` VARCHAR(500) NULL,
    `image_count` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `review_note` VARCHAR(300) NULL,
    `reviewed_by_id` CHAR(36) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `exam_contributions_status_created_at_idx`(`status`, `created_at`),
    INDEX `exam_contributions_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `exam_contributions` ADD CONSTRAINT `exam_contributions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
