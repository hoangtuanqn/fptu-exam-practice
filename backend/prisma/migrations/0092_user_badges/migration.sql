-- CreateTable: learner badges (earned state only; the catalog lives in code). Additive.
CREATE TABLE `user_badges` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` CHAR(36) NOT NULL,
    `badge_key` VARCHAR(40) NOT NULL,
    `tier` TINYINT NOT NULL,
    `pinned` BOOLEAN NOT NULL DEFAULT false,
    `earned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tier_updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_badges_user_id_badge_key_key`(`user_id`, `badge_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_badges` ADD CONSTRAINT `user_badges_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
