-- Courses added from a member-pasted link stay out of the member catalog until an admin lists them.
ALTER TABLE `coursera_courses`
  ADD COLUMN `listed` BOOLEAN NOT NULL DEFAULT TRUE;
