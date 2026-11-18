-- FuOverflow source URLs pasted by admins and the "load new data" runs over them.
-- Additive: two new tables, no change to existing tables. exam_id / created_by_id are soft references (no FK).
-- active_lock is 1 only while a run is RUNNING; the unique index allows one running run at a time.
CREATE TABLE `fuo_source_urls` (
    `id` CHAR(36) NOT NULL,
    `thread_id` VARCHAR(20) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `status` ENUM('NEW', 'QUEUED', 'RUNNING', 'DONE', 'FAILED') NOT NULL DEFAULT 'NEW',
    `result` ENUM('IMPORTED', 'UPDATED', 'UNCHANGED', 'ORDER_CHANGED') NULL,
    `exam_id` CHAR(36) NULL,
    `last_run_id` CHAR(36) NULL,
    `last_error` TEXT NULL,
    `processed_at` DATETIME(3) NULL,
    `added_questions` INTEGER NOT NULL DEFAULT 0,
    `comments_refreshed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `fuo_source_urls_thread_id_key`(`thread_id`),
    INDEX `fuo_source_urls_status_updated_at_idx`(`status`, `updated_at`),
    INDEX `fuo_source_urls_updated_at_idx`(`updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `fuo_source_runs` (
    `id` CHAR(36) NOT NULL,
    `status` ENUM('RUNNING', 'DONE', 'NEEDS_AUTH') NOT NULL DEFAULT 'RUNNING',
    `active_lock` BOOLEAN NULL,
    `total` INTEGER NOT NULL DEFAULT 0,
    `done` INTEGER NOT NULL DEFAULT 0,
    `failed` INTEGER NOT NULL DEFAULT 0,
    `imported` INTEGER NOT NULL DEFAULT 0,
    `updated` INTEGER NOT NULL DEFAULT 0,
    `last_error` TEXT NULL,
    `created_by_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finished_at` DATETIME(3) NULL,

    UNIQUE INDEX `fuo_source_runs_active_lock_key`(`active_lock`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
