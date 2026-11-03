-- CreateTable
CREATE TABLE `exams` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `thread_id` VARCHAR(20) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `source_url` VARCHAR(500) NOT NULL,
    `author` VARCHAR(100) NULL,
    `posted_at` DATETIME(3) NULL,
    `total_questions` INTEGER NOT NULL,
    `created_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `exams_thread_id_key`(`thread_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_questions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `exam_id` INTEGER NOT NULL,
    `number` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `image_path` VARCHAR(255) NOT NULL,
    `source_image` VARCHAR(500) NOT NULL,
    `media_url` VARCHAR(500) NULL,
    `answer` VARCHAR(20) NOT NULL DEFAULT 'A',

    UNIQUE INDEX `exam_questions_exam_id_number_key`(`exam_id`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_comments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `question_id` INTEGER NOT NULL,
    `external_id` VARCHAR(30) NOT NULL,
    `author` VARCHAR(100) NOT NULL,
    `author_score` VARCHAR(20) NULL,
    `posted_at` DATETIME(3) NULL,
    `text` TEXT NOT NULL,
    `url` VARCHAR(500) NOT NULL,

    INDEX `exam_comments_question_id_idx`(`question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crawl_jobs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `thread_id` VARCHAR(20) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `status` ENUM('QUEUED', 'RUNNING', 'DONE', 'FAILED') NOT NULL DEFAULT 'QUEUED',
    `stage` VARCHAR(120) NULL,
    `error` TEXT NULL,
    `exam_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `started_at` DATETIME(3) NULL,
    `finished_at` DATETIME(3) NULL,

    INDEX `crawl_jobs_thread_id_status_idx`(`thread_id`, `status`),
    INDEX `crawl_jobs_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `exam_questions` ADD CONSTRAINT `exam_questions_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_comments` ADD CONSTRAINT `exam_comments_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `exam_questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crawl_jobs` ADD CONSTRAINT `crawl_jobs_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

