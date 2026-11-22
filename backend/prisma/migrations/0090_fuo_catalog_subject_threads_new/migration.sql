-- New threads found for a subject by its last catalog run (shown as "new exams per subject" after "load new data")
ALTER TABLE `fuo_catalog_subjects` ADD COLUMN `threads_new` INTEGER NOT NULL DEFAULT 0;
