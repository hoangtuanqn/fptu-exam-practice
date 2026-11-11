-- CreateTable
CREATE TABLE `prompt_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `surface` VARCHAR(40) NOT NULL,
    `event` VARCHAR(12) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `prompt_events_surface_event_created_at_idx`(`surface`, `event`, `created_at`),
    INDEX `prompt_events_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `prompt_events` ADD CONSTRAINT `prompt_events_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
