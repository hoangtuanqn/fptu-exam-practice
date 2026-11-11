-- CreateTable
CREATE TABLE `admin_notices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kind` VARCHAR(40) NOT NULL,
    `level` VARCHAR(10) NOT NULL,
    `important` BOOLEAN NOT NULL DEFAULT false,
    `title` VARCHAR(200) NOT NULL,
    `body` VARCHAR(500) NULL,
    `user_id` INTEGER NULL,
    `link` VARCHAR(200) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `read_at` DATETIME(3) NULL,

    INDEX `admin_notices_read_at_created_at_idx`(`read_at`, `created_at`),
    INDEX `admin_notices_important_created_at_idx`(`important`, `created_at`),
    INDEX `admin_notices_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
