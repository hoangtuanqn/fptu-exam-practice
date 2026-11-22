// Trùng với giới hạn của máy chủ (máy chủ vẫn kiểm tra lại)
export const MAX_IMAGES = 100;
export const MAX_IMAGE_MB = 10;
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
export const MAX_TOTAL_BYTES = 290 * 1024 * 1024; // máy chủ chặn cả yêu cầu theo tổng dung lượng; chừa phần đầu multipart
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
