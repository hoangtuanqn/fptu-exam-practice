-- AlterTable
ALTER TABLE `users` ADD COLUMN `github_id` VARCHAR(32) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_github_id_key` ON `users`(`github_id`);
