-- Chỉ thêm/đổi index, không đụng dữ liệu. INPLACE + LOCK=NONE: bảng vẫn đọc/ghi bình thường trong lúc tạo.

-- bank_transactions: (status, transaction_at, amount_in) thay (status, created_at)
ALTER TABLE `bank_transactions` ADD INDEX `bank_transactions_status_transaction_at_amount_in_idx`(`status`, `transaction_at`, `amount_in`), ALGORITHM=INPLACE, LOCK=NONE;
ALTER TABLE `bank_transactions` DROP INDEX `bank_transactions_status_created_at_idx`, ALGORITHM=INPLACE, LOCK=NONE;

-- wallet_transactions
ALTER TABLE `wallet_transactions` ADD INDEX `wallet_transactions_type_created_at_idx`(`type`, `created_at`), ALGORITHM=INPLACE, LOCK=NONE;

-- crawl_jobs
ALTER TABLE `crawl_jobs` ADD INDEX `crawl_jobs_user_id_created_at_idx`(`user_id`, `created_at`), ALGORITHM=INPLACE, LOCK=NONE;

-- pe_downloads
ALTER TABLE `pe_downloads` ADD INDEX `pe_downloads_user_id_thread_id_status_idx`(`user_id`, `thread_id`, `status`), ALGORITHM=INPLACE, LOCK=NONE;

-- users
ALTER TABLE `users` ADD INDEX `users_status_idx`(`status`), ALGORITHM=INPLACE, LOCK=NONE;
ALTER TABLE `users` ADD INDEX `users_role_status_idx`(`role`, `status`), ALGORITHM=INPLACE, LOCK=NONE;
