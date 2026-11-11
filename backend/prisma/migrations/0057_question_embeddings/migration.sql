-- Vector of each question per embedding model (float32 little-endian bytes), used to group similar questions across exams.
-- Additive: one new table.
CREATE TABLE `question_embeddings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `question_id` INTEGER NOT NULL,
    `model_name` VARCHAR(64) NOT NULL,
    `dimensions` INTEGER NOT NULL,
    `embedding` MEDIUMBLOB NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `question_embeddings_question_id_model_name_key`(`question_id`, `model_name`),
    INDEX `question_embeddings_model_name_idx`(`model_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `question_embeddings` ADD CONSTRAINT `question_embeddings_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `exam_questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
