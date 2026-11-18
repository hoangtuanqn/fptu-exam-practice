-- Full FuOverflow catalog: thread kind/label, exam kind/description, and the admin catalog run tables.
-- Additive: new columns (nullable or with a default), one index, two new tables. No UPDATE/DELETE of existing rows.
-- fuo_threads.kind: existing rows were all imported with the "Đề Thi FE" label filter (scripts/import-fuo-catalog.ts),
-- so the column is added with DEFAULT 'FE' (fills existing rows as part of the ADD COLUMN) and the default is then switched
-- to 'OTHER' for new rows. The next catalog run rewrites kind/label from the live labels anyway.
-- exams.kind stays NULL for existing rows; the API fills it at boot from the title (examRepository.backfillKinds).
ALTER TABLE `fuo_threads`
    ADD COLUMN `kind` ENUM('FE', 'PE', 'QUIZ', 'OTHER') NOT NULL DEFAULT 'FE',
    ADD COLUMN `label` VARCHAR(60) NULL;

ALTER TABLE `fuo_threads` ALTER COLUMN `kind` SET DEFAULT 'OTHER';

CREATE INDEX `fuo_threads_kind_idx` ON `fuo_threads`(`kind`);

ALTER TABLE `exams`
    ADD COLUMN `kind` ENUM('FE', 'PE', 'QUIZ', 'OTHER') NULL,
    ADD COLUMN `description` TEXT NULL;

-- active_lock is 1 only while a run is RUNNING; the unique index allows one running run at a time.
CREATE TABLE `fuo_catalog_runs` (
    `id` CHAR(36) NOT NULL,
    `status` ENUM('RUNNING', 'DONE', 'NEEDS_AUTH', 'FAILED') NOT NULL DEFAULT 'RUNNING',
    `active_lock` BOOLEAN NULL,
    `subjects_total` INTEGER NOT NULL DEFAULT 0,
    `subjects_done` INTEGER NOT NULL DEFAULT 0,
    `subjects_failed` INTEGER NOT NULL DEFAULT 0,
    `threads_found` INTEGER NOT NULL DEFAULT 0,
    `threads_new` INTEGER NOT NULL DEFAULT 0,
    `threads_updated` INTEGER NOT NULL DEFAULT 0,
    `last_error` TEXT NULL,
    `created_by_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finished_at` DATETIME(3) NULL,

    UNIQUE INDEX `fuo_catalog_runs_active_lock_key`(`active_lock`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `fuo_catalog_subjects` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `status` ENUM('QUEUED', 'RUNNING', 'DONE', 'FAILED') NOT NULL DEFAULT 'QUEUED',
    `last_run_id` CHAR(36) NULL,
    `pages` INTEGER NOT NULL DEFAULT 0,
    `threads` INTEGER NOT NULL DEFAULT 0,
    `last_error` TEXT NULL,
    `crawled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `fuo_catalog_subjects_code_key`(`code`),
    INDEX `fuo_catalog_subjects_last_run_id_status_idx`(`last_run_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
