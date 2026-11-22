-- AlterTable: broadcast key so a retried system notice skips users who already got it (NULLs never collide)
ALTER TABLE `user_notices` ADD COLUMN `dedupe_key` VARCHAR(64) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `user_notices_user_id_dedupe_key_key` ON `user_notices`(`user_id`, `dedupe_key`);
