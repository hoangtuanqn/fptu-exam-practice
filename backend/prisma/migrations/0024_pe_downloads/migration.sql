-- AlterTable
ALTER TABLE `wallet_transactions` MODIFY `type` ENUM('DEPOSIT', 'ADMIN_ADJUST', 'CRAWL_CHARGE', 'CRAWL_REFUND', 'GIFT_CODE', 'REPORT_REWARD', 'EXPLAIN_CHARGE', 'EXPLAIN_REFUND', 'REFERRAL_BONUS', 'REFERRAL_COMMISSION', 'SIGNUP_BONUS', 'DEPOSIT_BONUS', 'PE_CHARGE', 'PE_REFUND') NOT NULL;

-- CreateTable
CREATE TABLE `pe_downloads` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `thread_id` VARCHAR(20) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `price` INTEGER NOT NULL,
    `files` INTEGER NOT NULL DEFAULT 0,
    `size_bytes` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(10) NOT NULL DEFAULT 'PENDING',
    `error` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pe_downloads_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pe_downloads` ADD CONSTRAINT `pe_downloads_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
