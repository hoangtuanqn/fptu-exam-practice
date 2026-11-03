-- AlterTable
ALTER TABLE `wallet_transactions` MODIFY `type` ENUM('DEPOSIT', 'ADMIN_ADJUST', 'CRAWL_CHARGE', 'CRAWL_REFUND', 'GIFT_CODE', 'REPORT_REWARD') NOT NULL;

-- CreateTable
CREATE TABLE `answer_reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `exam_id` INTEGER NOT NULL,
    `question_number` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `current_answer` VARCHAR(20) NOT NULL,
    `proposed_answer` VARCHAR(20) NOT NULL,
    `reason` VARCHAR(1000) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reward` INTEGER NOT NULL DEFAULT 0,
    `review_note` VARCHAR(300) NULL,
    `reviewed_by_id` INTEGER NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `answer_reports_status_created_at_idx`(`status`, `created_at`),
    INDEX `answer_reports_exam_id_idx`(`exam_id`),
    UNIQUE INDEX `answer_reports_user_id_exam_id_question_number_key`(`user_id`, `exam_id`, `question_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `answer_reports` ADD CONSTRAINT `answer_reports_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `answer_reports` ADD CONSTRAINT `answer_reports_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
