-- AlterTable: self-service account deletion. delete_requested_at starts the grace period, deleted_at marks an anonymised row, deleted_email_hash stops re-registration bonuses. Additive.
ALTER TABLE `users`
  ADD COLUMN `delete_requested_at` DATETIME(3) NULL,
  ADD COLUMN `deleted_at` DATETIME(3) NULL,
  ADD COLUMN `deleted_email_hash` VARCHAR(64) NULL;

CREATE INDEX `users_delete_requested_at_idx` ON `users`(`delete_requested_at`);
CREATE INDEX `users_deleted_email_hash_idx` ON `users`(`deleted_email_hash`);
