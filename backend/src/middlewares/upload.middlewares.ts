import multer from "multer";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { CONTRIBUTION_MAX_FILE_BYTES, CONTRIBUTION_MAX_FILE_MB, CONTRIBUTION_MAX_IMAGES, CONTRIBUTION_MAX_REQUEST_BYTES } from "../constants/exam-contribution";
import { EXAM_UPLOAD_ANSWERS_MAX_CHARS, EXAM_UPLOAD_MAX_FILE_BYTES, EXAM_UPLOAD_MAX_IMAGES, EXAM_UPLOAD_MAX_REQUEST_BYTES } from "../constants/exam-upload";
import { MATERIAL_MAX_FILE_BYTES, MATERIAL_MAX_FILE_MB } from "../constants/materials";
import { HTTP_STATUS } from "../constants/httpStatus";
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
      return next(new AppError(err.code === "LIMIT_FILE_SIZE" ? `Tệp quá lớn, tối đa ${MATERIAL_MAX_FILE_MB} MB` : "Không đọc được tệp tải lên. Hãy chọn lại một tệp PDF rồi thử lại.", 400));
    }
    next(err);
  });
};

// ---- Ảnh đóng góp đề thi: field "images", nhiều tệp. Mimetype chỉ lọc sơ bộ; service kiểm tra byte đầu và giải mã bằng sharp ----
const contributionUpload = multer({
  storage, // RAM: tổng dung lượng bị chặn bởi Content-Length bên dưới
  limits: { fileSize: CONTRIBUTION_MAX_FILE_BYTES, files: CONTRIBUTION_MAX_IMAGES, fields: 10, fieldSize: 4096 },
  fileFilter(_req, file, cb) {
    if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new AppError("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP", 400));
  },
}).array("images", CONTRIBUTION_MAX_IMAGES);

const CONTRIBUTION_MULTER_MESSAGES: Partial<Record<multer.ErrorCode, string>> = {
  LIMIT_FILE_SIZE: `Mỗi ảnh tối đa ${CONTRIBUTION_MAX_FILE_MB} MB`,
  LIMIT_FILE_COUNT: `Mỗi lần gửi tối đa ${CONTRIBUTION_MAX_IMAGES} ảnh`,
  LIMIT_UNEXPECTED_FILE: `Mỗi lần gửi tối đa ${CONTRIBUTION_MAX_IMAGES} ảnh`,
  LIMIT_FIELD_VALUE: "Nội dung một trường quá dài (ví dụ tệp đáp án)",
};

// Chặn tổng dung lượng theo Content-Length trước khi multer đọc thân vào RAM, rồi đổi lỗi multer thành lời nhắn tiếng Việt
const withBodyCap =
  (parse: RequestHandler, maxBytes: number): RequestHandler =>
  (req, res, next) => {
    const length = Number(req.headers["content-length"]);
    if (!Number.isFinite(length) || length <= 0) return next(new AppError("Không đọc được ảnh tải lên. Hãy chọn lại ảnh rồi thử lại.", 400));
    if (length > maxBytes) return next(new AppError("Tổng dung lượng ảnh quá lớn. Hãy chia thành nhiều lần gửi.", HTTP_STATUS.PAYLOAD_TOO_LARGE));
    parse(req, res, (err: unknown) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        return next(new AppError(CONTRIBUTION_MULTER_MESSAGES[err.code] ?? "Không đọc được ảnh tải lên. Hãy chọn lại ảnh rồi thử lại.", 400));
      }
      next(err);
    });
  };

export const uploadContributionImages = withBodyCap(contributionUpload, CONTRIBUTION_MAX_REQUEST_BYTES);

// ---- Admin tải đề bằng tay: field "images" (Q1.webp...) + trường "answers" (nội dung ans.json). Service kiểm tra tên và byte đầu WebP ----
const examImagesUpload = multer({
  storage,
  limits: { fileSize: EXAM_UPLOAD_MAX_FILE_BYTES, files: EXAM_UPLOAD_MAX_IMAGES, fields: 10, fieldSize: EXAM_UPLOAD_ANSWERS_MAX_CHARS },
}).array("images", EXAM_UPLOAD_MAX_IMAGES);

export const uploadExamImages = withBodyCap(examImagesUpload, EXAM_UPLOAD_MAX_REQUEST_BYTES);

// ---- Admin tải thư mục tài liệu (PDF, zip, video...): field "files", nhiều tệp. Không lọc mimetype; service xét loại theo đuôi tệp ----
const examFilesUpload = multer({
  storage,
  limits: { fileSize: EXAM_UPLOAD_MAX_FILE_BYTES, files: EXAM_UPLOAD_MAX_IMAGES, fields: 10, fieldSize: EXAM_UPLOAD_ANSWERS_MAX_CHARS },
});

export const uploadExamFiles = withBodyCap(examFilesUpload.array("files", EXAM_UPLOAD_MAX_IMAGES), EXAM_UPLOAD_MAX_REQUEST_BYTES);
// Thay nội dung một tệp đính kèm: field "file", cùng giới hạn; service bắt đúng một tệp (báo lỗi rõ hơn lỗi multer)
export const uploadExamFile = withBodyCap(examFilesUpload.array("file", EXAM_UPLOAD_MAX_IMAGES), EXAM_UPLOAD_MAX_REQUEST_BYTES);
