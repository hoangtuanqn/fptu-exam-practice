import { Router } from "express";
import { marketingController } from "../controllers/marketing.controllers";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { unsubscribeBody, unsubscribeQuery } from "../rules/requests/marketing.request";

// Công khai, không cần đăng nhập: xác thực bằng chữ ký trong token
const marketingRouter = Router();
const UNSUBSCRIBE_LIMIT_PER_MIN = 120; // one-click POSTs come from the mail provider IPs, shared by many users

marketingRouter.post("/unsubscribe", makeLimiter({ limit: UNSUBSCRIBE_LIMIT_PER_MIN }), validate(unsubscribeQuery, "query"), validate(unsubscribeBody), marketingController.unsubscribe);

export default marketingRouter;
