-- AlterTable
ALTER TABLE `practice_sessions` ADD COLUMN `violations` JSON NOT NULL DEFAULT (JSON_ARRAY());

-- AlterTable
ALTER TABLE `exam_attempts` ADD COLUMN `violations` JSON NOT NULL DEFAULT (JSON_ARRAY());
