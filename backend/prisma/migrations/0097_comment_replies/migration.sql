-- Comment replies (two levels: replies are flat under one root) and dislikes (decision 0019).
-- Additive: two nullable columns, indexes and self foreign keys on exam_comments; one column with a default on exam_comment_likes. Applies after 0096.

-- AlterTable
ALTER TABLE `exam_comments` ADD COLUMN `parent_id` CHAR(36) NULL,
    ADD COLUMN `reply_to_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `exam_comment_likes` ADD COLUMN `is_dislike` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `exam_comments_exam_id_question_number_parent_id_status_creat_idx` ON `exam_comments`(`exam_id`, `question_number`, `parent_id`, `status`, `created_at`);

-- CreateIndex
CREATE INDEX `exam_comments_parent_id_status_created_at_idx` ON `exam_comments`(`parent_id`, `status`, `created_at`);

-- CreateIndex
CREATE INDEX `exam_comments_reply_to_id_idx` ON `exam_comments`(`reply_to_id`);

-- AddForeignKey
ALTER TABLE `exam_comments` ADD CONSTRAINT `exam_comments_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `exam_comments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_comments` ADD CONSTRAINT `exam_comments_reply_to_id_fkey` FOREIGN KEY (`reply_to_id`) REFERENCES `exam_comments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

