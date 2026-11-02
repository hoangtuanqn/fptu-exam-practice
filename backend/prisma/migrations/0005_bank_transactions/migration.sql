-- CreateTable
CREATE TABLE `bank_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sepay_id` VARCHAR(40) NOT NULL,
    `gateway` VARCHAR(191) NULL,
    `account_number` VARCHAR(191) NULL,
    `content` TEXT NOT NULL,
    `amount_in` INTEGER NOT NULL,
    `reference_code` VARCHAR(191) NULL,
    `transaction_at` DATETIME(3) NOT NULL,
    `status` ENUM('MATCHED', 'UNMATCHED') NOT NULL,
    `deposit_order_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `bank_transactions_sepay_id_key`(`sepay_id`),
    UNIQUE INDEX `bank_transactions_deposit_order_id_key`(`deposit_order_id`),
    INDEX `bank_transactions_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bank_transactions` ADD CONSTRAINT `bank_transactions_deposit_order_id_fkey` FOREIGN KEY (`deposit_order_id`) REFERENCES `deposit_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

