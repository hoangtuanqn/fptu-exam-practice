-- AlterTable
ALTER TABLE `crawl_jobs` ADD COLUMN `guest_id` VARCHAR(64) NULL,
    MODIFY `user_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `user_exams` ADD COLUMN `guest_id` VARCHAR(64) NULL,
    MODIFY `user_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `crawl_jobs_guest_id_status_idx` ON `crawl_jobs`(`guest_id`, `status`);

-- CreateIndex
CREATE INDEX `user_exams_guest_id_created_at_idx` ON `user_exams`(`guest_id`, `created_at`);

-- CreateIndex
CREATE UNIQUE INDEX `user_exams_guest_id_exam_id_key` ON `user_exams`(`guest_id`, `exam_id`);

