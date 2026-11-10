-- AlterTable
ALTER TABLE `gift_codes` ADD COLUMN `credit_ttl_minutes` INTEGER NULL;

-- AlterTable
ALTER TABLE `wallet_transactions` MODIFY `type` ENUM('DEPOSIT', 'ADMIN_ADJUST', 'CRAWL_CHARGE', 'CRAWL_REFUND', 'GIFT_CODE', 'REPORT_REWARD', 'EXPLAIN_CHARGE', 'EXPLAIN_REFUND', 'REFERRAL_BONUS', 'REFERRAL_COMMISSION', 'SIGNUP_BONUS', 'DEPOSIT_BONUS', 'PE_CHARGE', 'PE_REFUND', 'PLAN_CHARGE', 'CHECKIN_REWARD', 'CREDIT_EXPIRED') NOT NULL;

-- CreateTable
CREATE TABLE `credit_lots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `source` VARCHAR(20) NOT NULL,
    `amount` INTEGER NOT NULL,
    `remaining` INTEGER NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `note` VARCHAR(200) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `credit_lots_user_id_remaining_expires_at_idx`(`user_id`, `remaining`, `expires_at`),
    INDEX `credit_lots_expires_at_remaining_idx`(`expires_at`, `remaining`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `credit_lots` ADD CONSTRAINT `credit_lots_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
