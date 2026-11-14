ALTER TABLE `coursera_courses`
  ADD COLUMN `code` VARCHAR(32) NULL,
  MODIFY `url` VARCHAR(500) NULL,
  ADD UNIQUE INDEX `coursera_courses_code_key` (`code`);
