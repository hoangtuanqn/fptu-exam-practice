-- AlterTable
ALTER TABLE `wallet_transactions` MODIFY `type` ENUM('DEPOSIT', 'ADMIN_ADJUST', 'CRAWL_CHARGE', 'CRAWL_REFUND', 'GIFT_CODE') NOT NULL;

-- CreateTable
CREATE TABLE `gift_codes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(32) NOT NULL,
    `amount` INTEGER NOT NULL,
    `max_uses` INTEGER NOT NULL,
    `used_count` INTEGER NOT NULL DEFAULT 0,
    `expires_at` DATETIME(3) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `note` VARCHAR(200) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `gift_codes_code_key`(`code`),
    INDEX `gift_codes_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gift_code_redemptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `gift_code_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `amount` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `gift_code_redemptions_user_id_idx`(`user_id`),
    UNIQUE INDEX `gift_code_redemptions_gift_code_id_user_id_key`(`gift_code_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `gift_code_redemptions` ADD CONSTRAINT `gift_code_redemptions_gift_code_id_fkey` FOREIGN KEY (`gift_code_id`) REFERENCES `gift_codes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gift_code_redemptions` ADD CONSTRAINT `gift_code_redemptions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
