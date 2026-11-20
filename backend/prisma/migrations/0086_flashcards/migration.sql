-- CreateTable
CREATE TABLE `flashcards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subject_id` CHAR(36) NOT NULL,
    `number` INTEGER NOT NULL,
    `answer` VARCHAR(20) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `flashcards_subject_id_number_key`(`subject_id`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `flashcards` ADD CONSTRAINT `flashcards_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
