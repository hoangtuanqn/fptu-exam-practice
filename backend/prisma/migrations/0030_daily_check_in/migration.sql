-- AlterTable
ALTER TABLE `wallet_transactions` MODIFY `type` ENUM('DEPOSIT', 'ADMIN_ADJUST', 'CRAWL_CHARGE', 'CRAWL_REFUND', 'GIFT_CODE', 'REPORT_REWARD', 'EXPLAIN_CHARGE', 'EXPLAIN_REFUND', 'REFERRAL_BONUS', 'REFERRAL_COMMISSION', 'SIGNUP_BONUS', 'DEPOSIT_BONUS', 'PE_CHARGE', 'PE_REFUND', 'CHECKIN_REWARD') NOT NULL;

-- CreateTable
CREATE TABLE `daily_check_ins` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `day` DATE NOT NULL,
    `streak` INTEGER NOT NULL,
    `amount` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `daily_check_ins_user_id_day_key`(`user_id`, `day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `daily_check_ins` ADD CONSTRAINT `daily_check_ins_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
