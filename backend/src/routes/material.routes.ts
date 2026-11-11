import { Router, type RequestHandler } from "express";
import { MATERIAL_UPLOADS_PER_HOUR } from "../constants/materials";
import { materialController } from "../controllers/material.controllers";
import { authenticate } from "../middlewares/auth.middlewares";
import { drainBeforeError, drainingLimitHandler } from "../middlewares/drain.middlewares";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { uploadMaterialPdf } from "../middlewares/upload.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { materialIdParam, materialUploadBody } from "../rules/requests/material.request";

// Phân tích slide (Pro): tài liệu của chính người dùng.
// Mọi lần từ chối sớm (401, 403/503 ở gate, 429 của hai bộ giới hạn, lỗi multer) đọc bỏ thân yêu cầu trước khi trả lời:
// không thì Node đóng kết nối khi thân chưa đọc hết và Nginx trả 502 thay cho lời báo lỗi.
const byUser = {
  keyGenerator: (req: { user?: { id: number } }) => `user:${req.user?.id ?? "anon"}`,
  validate: { keyGeneratorIpFallback: false },
  handler: drainingLimitHandler,
};

export interface MaterialRouterDeps {
  authenticate: RequestHandler;
  controller: Record<"quota" | "list" | "gate" | "create" | "detail" | "remove", RequestHandler>;
}

// Dựng router (test truyền xác thực và controller giả). Bộ giới hạn tạo mới mỗi lần dựng.
export function createMaterialRouter({ authenticate, controller }: MaterialRouterDeps) {
  // Tải lên: giới hạn theo tài khoản, chỉ đếm lần nhận tệp thành công. Đặt TRƯỚC multer để không đọc tệp của yêu cầu bị chặn
  const uploadLimiter = makeLimiter({
    windowMs: 60 * 60 * 1000,
    limit: MATERIAL_UPLOADS_PER_HOUR,
    skipFailedRequests: true,
    message: "Bạn đã tải lên nhiều tài liệu trong thời gian ngắn, vui lòng thử lại sau",
    ...byUser,
  });

  const router = Router();
  router.use(authenticate, makeLimiter({ limit: 120, ...byUser })); // trang kết quả hỏi tiến độ định kỳ

  router.get("/quota", controller.quota);
  router.get("/", controller.list);
  router.post("/", controller.gate, uploadLimiter, uploadMaterialPdf, validate(materialUploadBody), controller.create);
  router.get("/:id", validate(materialIdParam, "params"), controller.detail);
  router.delete("/:id", validate(materialIdParam, "params"), controller.remove);
  router.use(drainBeforeError); // lỗi của router này: đọc bỏ thân rồi mới chuyển cho errorHandler chung
  return router;
}

const materialRouter = createMaterialRouter({ authenticate, controller: materialController });

export default materialRouter;
