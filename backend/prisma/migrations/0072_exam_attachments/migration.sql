-- CreateTable
CREATE TABLE `exam_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `exam_id` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(255) NOT NULL,
    `mime` VARCHAR(100) NOT NULL,
    `size_bytes` INTEGER NOT NULL,
    `source_url` VARCHAR(500) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `exam_attachments_exam_id_file_path_key`(`exam_id`, `file_path`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `exam_attachments` ADD CONSTRAINT `exam_attachments_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
