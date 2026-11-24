-- AlterTable: when the owner first opened the exam (mode picked or preview viewed). Nullable, additive.
ALTER TABLE `user_exams` ADD COLUMN `opened_at` DATETIME(3) NULL;
