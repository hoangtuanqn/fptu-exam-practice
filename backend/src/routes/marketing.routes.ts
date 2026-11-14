import { Router } from "express";
import { marketingController } from "../controllers/marketing.controllers";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { clickQuery, unsubscribeBody, unsubscribeQuery } from "../rules/requests/marketing.request";

// Công khai, không cần đăng nhập: xác thực bằng chữ ký trong token
const marketingRouter = Router();
const UNSUBSCRIBE_LIMIT_PER_MIN = 120; // one-click POSTs come from the mail provider IPs, shared by many users
const CLICK_LIMIT_PER_MIN = 120; // link scanners of mail providers share IPs too

marketingRouter.post("/unsubscribe", makeLimiter({ limit: UNSUBSCRIBE_LIMIT_PER_MIN }), validate(unsubscribeQuery, "query"), validate(unsubscribeBody), marketingController.unsubscribe);
marketingRouter.get("/click", makeLimiter({ limit: CLICK_LIMIT_PER_MIN }), validate(clickQuery, "query"), marketingController.click);

export default marketingRouter;
