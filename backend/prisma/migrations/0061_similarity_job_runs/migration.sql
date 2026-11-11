-- Last successful nightly similarity run per subject (jobs/similarity.cron.ts): which usable exams it saw and how far image hashing got.
-- Additive: one new table.
CREATE TABLE `similarity_job_runs` (
    `subject_id` INTEGER NOT NULL,
    `exam_signature` VARCHAR(100) NOT NULL,
    `hash_cursor` INTEGER NOT NULL DEFAULT 0,
    `finished_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`subject_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `similarity_job_runs` ADD CONSTRAINT `similarity_job_runs_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
