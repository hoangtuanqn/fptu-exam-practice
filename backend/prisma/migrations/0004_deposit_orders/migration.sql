-- CreateTable
CREATE TABLE `deposit_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `code` VARCHAR(30) NOT NULL,
    `amount` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `expires_at` DATETIME(3) NOT NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `deposit_orders_code_key`(`code`),
    INDEX `deposit_orders_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `deposit_orders_status_expires_at_idx`(`status`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `deposit_orders` ADD CONSTRAINT `deposit_orders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

