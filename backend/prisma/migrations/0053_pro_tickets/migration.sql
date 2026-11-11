-- CreateTable
CREATE TABLE `pro_tickets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `plan` VARCHAR(20) NOT NULL,
    `price` INTEGER NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `activated_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pro_tickets_user_id_activated_at_idx`(`user_id`, `activated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pro_tickets` ADD CONSTRAINT `pro_tickets_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
