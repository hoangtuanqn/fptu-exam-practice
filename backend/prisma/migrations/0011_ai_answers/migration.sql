-- DropForeignKey
ALTER TABLE `exam_comments` DROP FOREIGN KEY `exam_comments_question_id_fkey`;

-- AlterTable
ALTER TABLE `exams` ADD COLUMN `ai_report` TEXT NULL,
    ADD COLUMN `answer_source` VARCHAR(10) NOT NULL DEFAULT 'DEFAULT';

-- DropTable
DROP TABLE `exam_comments`;

