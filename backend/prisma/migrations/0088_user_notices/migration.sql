-- CreateTable
CREATE TABLE `user_notices` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `kind` VARCHAR(40) NOT NULL,
    `level` VARCHAR(10) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `body` VARCHAR(500) NULL,
    `link` VARCHAR(200) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `read_at` DATETIME(3) NULL,

    INDEX `user_notices_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `user_notices_user_id_read_at_idx`(`user_id`, `read_at`),
    INDEX `user_notices_read_at_idx`(`read_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_notices` ADD CONSTRAINT `user_notices_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
