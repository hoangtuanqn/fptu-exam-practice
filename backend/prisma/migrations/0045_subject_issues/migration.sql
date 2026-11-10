-- Problems found with a subject's syllabus data (for example: no chapter names), shown to admins. Additive: one new table.
CREATE TABLE `subject_issues` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `subject_code` VARCHAR(20) NOT NULL,
  `kind` VARCHAR(30) NOT NULL,
  `hits` INTEGER NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `subject_issues_subject_code_kind_key`(`subject_code`, `kind`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
