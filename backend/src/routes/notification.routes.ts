import { Router } from "express";
import { userNoticeController } from "../controllers/user-notice.controllers";
import { authenticate } from "../middlewares/auth.middlewares";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { readNoticeIdsBody } from "../rules/requests/user-notice.request";
import { paginationQuery } from "../utils/pagination";

// Chuông thông báo của thành viên (chỉ thấy và sửa thông báo của chính mình)
const notificationRouter = Router();
notificationRouter.use(authenticate, makeLimiter({ limit: 240 }));

notificationRouter.get("/", validate(paginationQuery, "query"), userNoticeController.list);
notificationRouter.get("/unread-count", userNoticeController.unreadCount);
notificationRouter.post("/read", validate(readNoticeIdsBody), userNoticeController.read);
notificationRouter.post("/read-all", userNoticeController.readAll);

export default notificationRouter;
