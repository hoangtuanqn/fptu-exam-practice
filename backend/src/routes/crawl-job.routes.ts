import { Router } from "express";
import rateLimit from "express-rate-limit";
import { crawlJobController } from "../controllers/crawl-job.controllers";
import { identify } from "../middlewares/auth.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { idParam, importExamBody } from "../rules/requests/crawl.request";

// Mỗi lượt nhập đề là một chuỗi request sang FuOverflow nên giới hạn theo IP: thành viên 10 lượt/giờ,
// khách (không bị tính phí) chặt hơn: 3 lượt/giờ
const limiter = (limit: number, skip: (user: unknown) => boolean, who: string) =>
  rateLimit({
    windowMs: 60 * 60 * 1000,
    limit,
    skip: (req) => skip(req.user),
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: false, message: `${who} nhập đề quá nhiều lần, vui lòng thử lại sau` },
  });
const memberLimiter = limiter(10, (user) => !user, "Bạn");
const guestLimiter = limiter(3, (user) => !!user, "Khách");

const crawlJobRouter = Router();

crawlJobRouter.use(identify); // thành viên hoặc khách đều được lấy đề

crawlJobRouter.post("/", memberLimiter, guestLimiter, validate(importExamBody), crawlJobController.submit);
crawlJobRouter.get("/price", crawlJobController.price);
crawlJobRouter.get("/:id", validate(idParam, "params"), crawlJobController.get);

export default crawlJobRouter;
