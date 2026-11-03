-- AlterTable
ALTER TABLE `wallet_transactions` MODIFY `type` ENUM('DEPOSIT', 'ADMIN_ADJUST', 'CRAWL_CHARGE', 'CRAWL_REFUND') NOT NULL;

-- AlterTable
ALTER TABLE `crawl_jobs` ADD COLUMN `charged_amount` INTEGER NOT NULL DEFAULT 0;

