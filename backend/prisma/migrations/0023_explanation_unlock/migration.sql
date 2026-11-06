-- CreateTable
CREATE TABLE `explanation_unlocks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `exam_id` INTEGER NOT NULL,
    `price` INTEGER NOT NULL,
    `questions` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `explanation_unlocks_exam_id_idx`(`exam_id`),
    UNIQUE INDEX `explanation_unlocks_user_id_exam_id_key`(`user_id`, `exam_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `explanation_unlocks` ADD CONSTRAINT `explanation_unlocks_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `explanation_unlocks` ADD CONSTRAINT `explanation_unlocks_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `explanation_purchases` ADD COLUMN `is_trial` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `wallet_transactions` MODIFY `type` ENUM('DEPOSIT', 'ADMIN_ADJUST', 'CRAWL_CHARGE', 'CRAWL_REFUND', 'GIFT_CODE', 'REPORT_REWARD', 'EXPLAIN_CHARGE', 'EXPLAIN_REFUND', 'REFERRAL_BONUS', 'REFERRAL_COMMISSION', 'SIGNUP_BONUS', 'DEPOSIT_BONUS') NOT NULL;
