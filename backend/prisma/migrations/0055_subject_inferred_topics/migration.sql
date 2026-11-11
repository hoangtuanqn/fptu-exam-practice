-- CreateTable
CREATE TABLE `subject_inferred_topics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subject_code` VARCHAR(20) NOT NULL,
    `topics` JSON NOT NULL,
    `source_hash` CHAR(64) NOT NULL,
    `model` VARCHAR(60) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `subject_inferred_topics_subject_code_key`(`subject_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
