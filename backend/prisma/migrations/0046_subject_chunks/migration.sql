-- Syllabus text split into chunks for semantic search (embedding stored as little-endian float32 bytes). Additive: one new table.
CREATE TABLE `subject_chunks` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `subject_code` VARCHAR(20) NOT NULL,
  `kind` VARCHAR(20) NOT NULL,
  `slug` VARCHAR(80) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `content_hash` CHAR(64) NOT NULL,
  `embedding` MEDIUMBLOB NULL,
  `model` VARCHAR(60) NULL,
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `subject_chunks_slug_key`(`slug`),
  INDEX `subject_chunks_subject_code_idx`(`subject_code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
