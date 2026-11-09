-- Syllabus pass mark and assessments (null until imported)
ALTER TABLE `subjects`
  ADD COLUMN `min_pass_mark` DECIMAL(3,1) NULL,
  ADD COLUMN `assessments` JSON NULL;

-- Opt-in switch for syncing FAP grades
CREATE TABLE `user_grade_settings` (
  `user_id` INTEGER NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT false,
  `synced_at` DATETIME(3) NULL,
  PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Synced grades, one row per student and course
CREATE TABLE `user_grades` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `course_id` VARCHAR(40) NOT NULL,
  `subject_code` VARCHAR(20) NOT NULL,
  `subject_name` VARCHAR(200) NOT NULL,
  `term_name` VARCHAR(40) NOT NULL,
  `class_code` VARCHAR(60) NOT NULL,
  `status` VARCHAR(12) NOT NULL,
  `average` DECIMAL(4,2) NULL,
  `components` JSON NOT NULL,
  `synced_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `user_grades_user_id_course_id_key`(`user_id`, `course_id`),
  INDEX `user_grades_user_id_subject_code_idx`(`user_id`, `subject_code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_grade_settings` ADD CONSTRAINT `user_grade_settings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `user_grades` ADD CONSTRAINT `user_grades_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
