import multer from "multer";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../rules/error";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// Lưu ảnh vào RAM (buffer), không ghi tạm ra đĩa
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter(_req, file, cb) {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP", 400));
    }
  },
});

// Middleware parse multipart/form-data, field tên "avatar"
export const uploadAvatar = upload.single("avatar");

// Kiểm tra sau khi multer chạy: file phải có
export const validateAvatarUpload = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.file) return next(new AppError("Vui lòng chọn ảnh", 400));
  next();
};
