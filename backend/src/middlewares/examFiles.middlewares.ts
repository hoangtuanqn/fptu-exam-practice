import { type Request, type RequestHandler, Router } from "express";
import { env, storageDir } from "../configs/env";
import { AppError } from "../rules/error";
import { examService } from "../services/exam.service";
import { actorOf } from "../utils/actor";
import { examRelPath, isValidExamFileSignature } from "../utils/exam-path";
import { resolveInside } from "../utils/exam-zip";
import { identify } from "./auth.middlewares";
import { makeLimiter } from "./rateLimit.middlewares";

// Ảnh đề (và mọi tệp dưới exams/<threadId>/) KHÔNG còn công khai: phải kèm danh tính (token hoặc ID khách) và đề phải nằm trong kho của người xem.
// Trình duyệt tải bằng fetch có header rồi hiển thị bằng blob, nên trên trang không có link ảnh dùng được ở nơi khác.
// Xem tối đa chừng này ảnh trong 5 phút cho mỗi tài khoản/khách: mở cả đề dài vẫn đủ, tải hàng loạt thì bị chặn
const examImageLimiter = makeLimiter({
  limit: 600,
  windowMs: 5 * 60 * 1000,
  keyGenerator: (req: Request) => (req.user ? `user:${req.user.id}` : `guest:${req.guestId ?? "anon"}`),
  validate: { keyGeneratorIpFallback: false },
  message: "Bạn xem ảnh đề quá nhanh.",
});

const serve: RequestHandler = async (req, res) => {
  const info = examRelPath(req.path);
  if (!info || info === "blocked") throw AppError.notFound("Không tìm thấy tệp");
  // Ảnh có chữ ký ngắn hạn (trang "Câu hay ra") thì không cần có đề trong kho; còn lại phải là đề của người xem hoặc admin
  // (link của trang "Câu hay ra" không buộc người xem; link xem thử đề chưa mua buộc vào đúng tài khoản đang xem)
  const signed = isValidExamFileSignature(info.rel, req.query.e, req.query.s, env.JWT_SECRET) || (!!req.user && isValidExamFileSignature(info.rel, req.query.e, req.query.s, env.JWT_SECRET, Date.now(), req.user.id));
  if (!signed) await examService.assertThreadFileAccess(actorOf(req), info.threadId);
  const abs = resolveInside(storageDir, info.rel);
  if (!abs) throw AppError.notFound("Không tìm thấy tệp");
  // private: chỉ trình duyệt của người xem được giữ; không để proxy/CDN dùng chung bản có danh tính khác
  res.set({ "Cache-Control": "private, max-age=3600", "Cross-Origin-Resource-Policy": "cross-origin", "X-Content-Type-Options": "nosniff" });
  await new Promise<void>((resolve, reject) =>
    res.sendFile(abs, { dotfiles: "deny" }, (err) => (err && !res.headersSent ? reject(AppError.notFound("Không tìm thấy tệp")) : resolve())),
  );
};

/** Gắn trước express.static ở /api/v1/files: đường dẫn ngoài exams/ (ví dụ ảnh đại diện) đi tiếp xuống static như cũ. */
export const examFilesRouter = (() => {
  const router = Router();
  router.use((req, _res, next) => (examRelPath(req.path) ? next() : next("router"))); // "blocked" cũng vào đây để bị 404, không rơi xuống static
  router.use(identify, examImageLimiter, serve);
  return router;
})();
