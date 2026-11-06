import { Router } from "express";
import rateLimit from "express-rate-limit";
import { chatController } from "../controllers/chat.controllers";
import { identify } from "../middlewares/auth.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { chatBody } from "../rules/requests/chat.request";

// Chặn dồn dập (ngoài giới hạn số câu mỗi ngày trong service): 12 câu / phút / IP
const askLimiter = rateLimit({ windowMs: 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false, message: { status: false, message: "Bạn hỏi quá nhanh, vui lòng chờ giây lát" } });

const chatRouter = Router();
chatRouter.use(identify); // thành viên hoặc khách đều hỏi được
chatRouter.get("/config", chatController.config);
chatRouter.post("/stream", askLimiter, validate(chatBody), chatController.stream);

export default chatRouter;
