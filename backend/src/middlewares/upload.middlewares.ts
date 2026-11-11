import multer from "multer";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { MATERIAL_MAX_FILE_BYTES, MATERIAL_MAX_FILE_MB } from "../constants/materials";
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

// ---- Tài liệu PDF cho Phân tích slide: field "file", một tệp. Mimetype chỉ lọc sơ bộ; service kiểm tra byte đầu "%PDF-" ----
const PDF_TYPES = ["application/pdf", "application/x-pdf", "application/octet-stream"];

const pdfUpload = multer({
  storage, // RAM: service băm sha256 rồi ghi ra thư mục tạm riêng cho job
  limits: { fileSize: MATERIAL_MAX_FILE_BYTES, files: 1, fields: 5 },
  fileFilter(_req, file, cb) {
    if (PDF_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new AppError("Chỉ chấp nhận tệp PDF", 400));
  },
}).single("file");

// Lỗi multer (quá lớn, sai field) đổi thành lời nhắn riêng cho PDF thay vì lời nhắn chung về ảnh
export const uploadMaterialPdf: RequestHandler = (req, res, next) => {
  pdfUpload(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      return next(new AppError(err.code === "LIMIT_FILE_SIZE" ? `Tệp quá lớn, tối đa ${MATERIAL_MAX_FILE_MB} MB` : "Tệp tải lên không hợp lệ", 400));
    }
    next(err);
  });
};
