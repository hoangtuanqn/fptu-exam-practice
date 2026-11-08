-- AlterTable
ALTER TABLE `users` ADD COLUMN `reminder_enabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `exam_date` DATE NULL,
    ADD COLUMN `reminder_sent_on` DATE NULL;
