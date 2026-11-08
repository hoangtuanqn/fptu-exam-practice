-- AlterTable
ALTER TABLE `users` ADD COLUMN `pro_expires_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `wallet_transactions` MODIFY `type` ENUM('DEPOSIT', 'ADMIN_ADJUST', 'CRAWL_CHARGE', 'CRAWL_REFUND', 'GIFT_CODE', 'REPORT_REWARD', 'EXPLAIN_CHARGE', 'EXPLAIN_REFUND', 'REFERRAL_BONUS', 'REFERRAL_COMMISSION', 'SIGNUP_BONUS', 'DEPOSIT_BONUS', 'PE_CHARGE', 'PE_REFUND', 'PLAN_CHARGE', 'CHECKIN_REWARD') NOT NULL;

-- CreateTable
CREATE TABLE `plan_purchases` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `plan` VARCHAR(20) NOT NULL,
    `months` INTEGER NOT NULL,
    `price` INTEGER NOT NULL,
    `starts_at` DATETIME(3) NOT NULL,
    `ends_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `plan_purchases_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `plan_purchases` ADD CONSTRAINT `plan_purchases_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
