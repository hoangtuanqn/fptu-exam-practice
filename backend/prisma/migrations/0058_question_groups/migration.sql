-- Groups of near-identical questions across exams of one subject (rebuilt by npm run groups:build).
-- Additive: two new tables.
CREATE TABLE `question_groups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subject_id` INTEGER NOT NULL,
    `model_name` VARCHAR(64) NOT NULL,
    `threshold` DOUBLE NOT NULL,
    `member_count` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `question_groups_subject_id_idx`(`subject_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `question_group_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `group_id` INTEGER NOT NULL,
    `subject_id` INTEGER NOT NULL,
    `question_id` INTEGER NOT NULL,

    UNIQUE INDEX `question_group_members_subject_id_question_id_key`(`subject_id`, `question_id`),
    INDEX `question_group_members_group_id_idx`(`group_id`),
    INDEX `question_group_members_question_id_idx`(`question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `question_groups` ADD CONSTRAINT `question_groups_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `question_group_members` ADD CONSTRAINT `question_group_members_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `question_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `question_group_members` ADD CONSTRAINT `question_group_members_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `question_group_members` ADD CONSTRAINT `question_group_members_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `exam_questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
