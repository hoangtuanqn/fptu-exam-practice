import { Router } from "express";
import rateLimit from "express-rate-limit";
import { crawlJobController } from "../controllers/crawl-job.controllers";
import { identify } from "../middlewares/auth.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { idParam, importExamBody } from "../rules/requests/crawl.request";

// Mỗi lượt nhập đề là một chuỗi request sang FuOverflow nên có thêm lớp giới hạn theo IP:
// thành viên 10 lượt/giờ; khách 5 lượt/ngày (chặn việc xoá dữ liệu trình duyệt để đổi ID khách,
// còn giới hạn 1 lượt/ngày chính xác theo ID khách nằm ở crawl-job.service)
const limiter = (windowMs: number, limit: number, skip: (user: unknown) => boolean, who: string) =>
  rateLimit({
    windowMs,
    limit,
    skip: (req) => skip(req.user),
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: false, message: `${who} nhập đề quá nhiều lần, vui lòng thử lại sau` },
  });
const memberLimiter = limiter(60 * 60 * 1000, 10, (user) => !user, "Bạn");
const guestLimiter = limiter(24 * 60 * 60 * 1000, 5, (user) => !!user, "Khách");

const crawlJobRouter = Router();

crawlJobRouter.use(identify); // thành viên hoặc khách đều được lấy đề

crawlJobRouter.post("/", memberLimiter, guestLimiter, validate(importExamBody), crawlJobController.submit);
crawlJobRouter.get("/price", crawlJobController.price);
crawlJobRouter.get("/:id", validate(idParam, "params"), crawlJobController.get);

export default crawlJobRouter;
