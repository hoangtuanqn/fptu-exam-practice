-- AlterTable
ALTER TABLE `exams` ADD COLUMN `refreshed_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `crawl_jobs` ADD COLUMN `refresh` BOOLEAN NOT NULL DEFAULT false;
