import { Router } from "express";
import { MATERIAL_UPLOADS_PER_HOUR } from "../constants/materials";
import { materialController } from "../controllers/material.controllers";
import { authenticate } from "../middlewares/auth.middlewares";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { uploadMaterialPdf } from "../middlewares/upload.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { materialIdParam, materialUploadBody } from "../rules/requests/material.request";

// Phân tích slide (Pro): tài liệu của chính người dùng
const byUser = { keyGenerator: (req: { user?: { id: number } }) => `user:${req.user?.id ?? "anon"}`, validate: { keyGeneratorIpFallback: false } };

// Tải lên: giới hạn theo tài khoản, chỉ đếm lần nhận tệp thành công. Đặt TRƯỚC multer để không đọc tệp của yêu cầu bị chặn
const uploadLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  limit: MATERIAL_UPLOADS_PER_HOUR,
  skipFailedRequests: true,
  message: "Bạn đã tải lên nhiều tài liệu trong thời gian ngắn, vui lòng thử lại sau",
  ...byUser,
});

const materialRouter = Router();
materialRouter.use(authenticate, makeLimiter({ limit: 120, ...byUser })); // trang kết quả hỏi tiến độ định kỳ

materialRouter.get("/quota", materialController.quota);
materialRouter.get("/", materialController.list);
materialRouter.post("/", materialController.gate, uploadLimiter, uploadMaterialPdf, validate(materialUploadBody), materialController.create);
materialRouter.get("/:id", validate(materialIdParam, "params"), materialController.detail);
materialRouter.delete("/:id", validate(materialIdParam, "params"), materialController.remove);

export default materialRouter;
