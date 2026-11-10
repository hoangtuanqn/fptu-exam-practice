import { Router } from "express";
import { giftCodeController } from "../controllers/gift-code.controllers";
import { authenticate } from "../middlewares/auth.middlewares";
import { giftCodeLimiter } from "../middlewares/rateLimit.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { redeemGiftCodeBody } from "../rules/requests/gift-code.request";
import { paginationQuery } from "../utils/pagination";

const giftCodeRouter = Router();

giftCodeRouter.use(authenticate);

// Nhập sai quá nhiều lần thì bị chặn tạm thời (chống dò mã)
giftCodeRouter.post("/redeem", giftCodeLimiter, validate(redeemGiftCodeBody), giftCodeController.redeem);
giftCodeRouter.get("/mine", validate(paginationQuery, "query"), giftCodeController.mine);
giftCodeRouter.get("/lots", giftCodeController.lots);

export default giftCodeRouter;
