import { Router } from "express";
import { badgeController } from "../controllers/badge.controllers";
import { authenticate } from "../middlewares/auth.middlewares";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { setBadgePinsBody } from "../rules/requests/badge.request";

// Huy hiệu của chính thành viên (chỉ để ghi nhận, không có trang công khai)
const badgeRouter = Router();
badgeRouter.use(authenticate, makeLimiter({ limit: 120 }));

badgeRouter.get("/me", badgeController.mine);
badgeRouter.put("/me/pins", validate(setBadgePinsBody), badgeController.setPins);

export default badgeRouter;
