-- AlterTable
ALTER TABLE `subjects` ADD COLUMN `semester` TINYINT UNSIGNED NULL;

-- CreateIndex
CREATE INDEX `subjects_semester_idx` ON `subjects`(`semester`);
