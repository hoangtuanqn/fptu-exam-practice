import { Router } from "express";
import { CONTRIBUTION_UPLOADS_PER_HOUR } from "../constants/exam-contribution";
import { examContributionController } from "../controllers/exam-contribution.controllers";
import { authenticate } from "../middlewares/auth.middlewares";
import { drainBeforeError, drainingLimitHandler } from "../middlewares/drain.middlewares";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { onePerUser } from "../middlewares/single-flight.middlewares";
import { uploadContributionImages } from "../middlewares/upload.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { createContributionBody } from "../rules/requests/exam-contribution.request";
import { paginationQuery } from "../utils/pagination";

// Đóng góp đề thi. Lần từ chối sớm (401, 429, lỗi multer) đọc bỏ thân yêu cầu trước khi trả lời (xem drain.middlewares).
// Giới hạn theo tài khoản, chỉ đếm lần gửi thành công; đặt TRƯỚC multer để không đọc ảnh của yêu cầu bị chặn
const uploadLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  limit: CONTRIBUTION_UPLOADS_PER_HOUR,
  skipFailedRequests: true,
  keyGenerator: (req) => `user:${req.user?.id ?? "anon"}`,
  validate: { keyGeneratorIpFallback: false },
  handler: drainingLimitHandler,
  message: "Bạn đã gửi nhiều đề trong thời gian ngắn.",
});

// Mỗi tài khoản một lần tải lên đang chạy: không giữ nhiều thân 300 MB cùng lúc trong RAM
const oneUploadAtATime = onePerUser("Bạn đang có một lần tải lên khác, hãy đợi nó xong rồi gửi tiếp.");

const examContributionRouter = Router();

examContributionRouter.use(authenticate);

examContributionRouter.post("/", uploadLimiter, oneUploadAtATime, examContributionController.gate, uploadContributionImages, validate(createContributionBody), examContributionController.create);
examContributionRouter.get("/mine", validate(paginationQuery, "query"), examContributionController.mine);
examContributionRouter.use(drainBeforeError);

export default examContributionRouter;
