-- Exam schedule rows synced from FAP (opt-in, same switch as the grades)
CREATE TABLE `user_exam_slots` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `exam_date` DATE NOT NULL,
  `start_time` VARCHAR(5) NOT NULL,
  `end_time` VARCHAR(5) NOT NULL,
  `room` VARCHAR(20) NOT NULL,
  `subject_code` VARCHAR(20) NOT NULL,
  `subject_name` VARCHAR(200) NOT NULL,
  `format` VARCHAR(30) NOT NULL,
  `kind` VARCHAR(12) NOT NULL,
  `result_date` DATE NULL,
  `note` VARCHAR(200) NOT NULL,
  INDEX `user_exam_slots_user_id_exam_date_idx`(`user_id`, `exam_date`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_exam_slots` ADD CONSTRAINT `user_exam_slots_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
