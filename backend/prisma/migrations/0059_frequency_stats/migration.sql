-- Past exam frequency per chapter and per question group (refreshed by npm run stats:refresh). Statistics only, not predictions.
-- Additive: two new tables.
CREATE TABLE `chapter_stats` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subject_id` INTEGER NOT NULL,
    `chapter` VARCHAR(255) NOT NULL,
    `question_count` INTEGER NOT NULL,
    `exams_with_chapter` INTEGER NOT NULL,
    `total_exams` INTEGER NOT NULL,
    `avg_questions_per_exam` DOUBLE NOT NULL,
    `recency_score` DOUBLE NOT NULL,
    `confidence` VARCHAR(10) NOT NULL,
    `last_seen_at` DATETIME(3) NULL,
    `computed_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `chapter_stats_subject_id_chapter_key`(`subject_id`, `chapter`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `question_group_stats` (
    `group_id` INTEGER NOT NULL,
    `subject_id` INTEGER NOT NULL,
    `chapter` VARCHAR(255) NULL,
    `exams_with_group` INTEGER NOT NULL,
    `total_exams` INTEGER NOT NULL,
    `last_seen_exam_id` INTEGER NULL,
    `last_seen_at` DATETIME(3) NULL,
    `representative_question_id` INTEGER NULL,
    `recency_score` DOUBLE NOT NULL,
    `confidence` VARCHAR(10) NOT NULL,
    `computed_at` DATETIME(3) NOT NULL,

    INDEX `question_group_stats_subject_rank_idx`(`subject_id`, `exams_with_group`, `recency_score`),
    PRIMARY KEY (`group_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `chapter_stats` ADD CONSTRAINT `chapter_stats_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `question_group_stats` ADD CONSTRAINT `question_group_stats_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `question_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `question_group_stats` ADD CONSTRAINT `question_group_stats_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
