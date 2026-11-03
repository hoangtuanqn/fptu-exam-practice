import { Router } from "express";
import rateLimit from "express-rate-limit";
import { crawlJobController } from "../controllers/crawl-job.controllers";
import { authenticate } from "../middlewares/auth.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { idParam, importExamBody } from "../rules/requests/crawl.request";

// Mỗi lượt nhập đề là một chuỗi request sang FuOverflow nên giới hạn chặt: 10 lượt / giờ / IP
const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: false, message: "Bạn nhập đề quá nhiều lần, vui lòng thử lại sau" },
});

const crawlJobRouter = Router();

crawlJobRouter.use(authenticate);

crawlJobRouter.post("/", importLimiter, validate(importExamBody), crawlJobController.submit);
crawlJobRouter.get("/price", crawlJobController.price);
crawlJobRouter.get("/:id", validate(idParam, "params"), crawlJobController.get);

export default crawlJobRouter;
