import { Router, type RequestHandler } from "express";
import { captchaService } from "../services/captcha.service";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { crawlJobController } from "../controllers/crawl-job.controllers";
import { identify, requireVerifiedMember } from "../middlewares/auth.middlewares";
import { isProUser } from "../utils/pro";
import { idempotent } from "../middlewares/idempotency.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { importExamBody } from "../rules/requests/crawl.request";

// Mở đề (có thể trừ phí) có thêm lớp giới hạn theo IP:
// thành viên 10 lượt/giờ; khách 5 lượt/ngày (chặn việc xoá dữ liệu trình duyệt để đổi ID khách,
// còn giới hạn 1 lượt/ngày chính xác theo ID khách nằm ở crawl-job.service)
const limiter = (windowMs: number, limit: number, skip: (user: unknown) => boolean, who: string) =>
  makeLimiter({ windowMs, limit, skip: (req) => skip(req.user), message: `${who} đã lấy đề quá nhiều lần trong thời gian ngắn.` });
// Thành viên Pro không bị giới hạn lượt; thành viên thường 10 lượt/giờ
const memberLimiter = limiter(60 * 60 * 1000, 10, (user) => !user || isProUser(user), "Bạn");
const guestLimiter = limiter(24 * 60 * 60 * 1000, 5, (user) => !!user, "Mạng bạn đang dùng");

// Giao diện gọi /quote trước khi người dùng xác nhận, nên cho nhiều hơn lượt mở đề
const quoteLimiter = makeLimiter({ limit: 240, message: "Bạn kiểm tra đề quá nhanh." });

// Khách (chưa đăng nhập) phải qua captcha trước khi lấy đề; thành viên không cần
const guestCaptcha: RequestHandler = (req, _res, next) => {
  if (req.user) return next();
  captchaService.assert(req.body?.captchaToken, req.ip).then(() => next(), next);
};

const crawlJobRouter = Router();

crawlJobRouter.use(identify); // thành viên hoặc khách đều được mở đề

crawlJobRouter.post("/", requireVerifiedMember, idempotent, memberLimiter, guestLimiter, guestCaptcha, validate(importExamBody), crawlJobController.submit);
crawlJobRouter.get("/price", crawlJobController.price);
crawlJobRouter.get("/quote", quoteLimiter, validate(importExamBody, "query"), crawlJobController.quote);

export default crawlJobRouter;
