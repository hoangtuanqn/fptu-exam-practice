-- AlterTable
ALTER TABLE `exams` ADD COLUMN `subject_code` VARCHAR(20) NULL;

-- CreateIndex
CREATE INDEX `exams_subject_code_answer_source_idx` ON `exams`(`subject_code`, `answer_source`);
