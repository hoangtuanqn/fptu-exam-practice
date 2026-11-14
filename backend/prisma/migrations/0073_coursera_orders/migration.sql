CREATE TABLE `coursera_courses` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `url` VARCHAR(500) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `coursera_courses_url_key` (`url`),
  INDEX `coursera_courses_is_active_id_idx` (`is_active`, `id`),
  INDEX `coursera_courses_title_idx` (`title`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `coursera_orders` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `course_id` INTEGER NOT NULL,
  `request_key` VARCHAR(36) NOT NULL,
  `course_title` VARCHAR(255) NOT NULL,
  `course_url` VARCHAR(500) NOT NULL,
  `email` VARCHAR(254) NOT NULL,
  `encrypted_password` TEXT NULL,
  `note` TEXT NOT NULL,
  `status` ENUM('PENDING','PROCESSING','COMPLETED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `admin_note` VARCHAR(2000) NOT NULL DEFAULT '',
  `credential_viewed_by` INTEGER NULL,
  `credential_viewed_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `coursera_orders_user_id_request_key_key` (`user_id`, `request_key`),
  INDEX `coursera_orders_user_id_id_idx` (`user_id`, `id`),
  INDEX `coursera_orders_status_id_idx` (`status`, `id`),
  INDEX `coursera_orders_course_id_idx` (`course_id`),
  CONSTRAINT `coursera_orders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `coursera_orders_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `coursera_courses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
