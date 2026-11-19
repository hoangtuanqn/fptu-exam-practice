import { type Request, type RequestHandler, Router } from "express";
import { storageDir } from "../configs/env";
import { examRepository } from "../repositories/exam.repository";
import { AppError } from "../rules/error";
import { examService } from "../services/exam.service";
import { actorOf } from "../utils/actor";
import { examRelPath } from "../utils/exam-path";
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

const idOfThread = new Map<string, { id: string; at: number }>(); // thread -> id đề, nhớ vài phút cho đỡ hỏi DB mỗi ảnh
const THREAD_TTL_MS = 5 * 60 * 1000;
const examIdOf = async (threadId: string) => {
  const hit = idOfThread.get(threadId);
  if (hit && Date.now() - hit.at < THREAD_TTL_MS) return hit.id;
  const exam = await examRepository.findByThreadId(threadId);
  if (!exam) return null;
  if (idOfThread.size > 500) idOfThread.clear();
  idOfThread.set(threadId, { id: exam.id, at: Date.now() });
  return exam.id;
};

const serve: RequestHandler = async (req, res) => {
  const info = examRelPath(req.path);
  if (!info || info === "blocked") throw AppError.notFound("Không tìm thấy tệp");
  const examId = await examIdOf(info.threadId);
  if (!examId) throw AppError.notFound("Không tìm thấy tệp");
  await examService.assertAccess(actorOf(req), examId); // không có trong kho của người xem: 404 như đề không tồn tại
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
