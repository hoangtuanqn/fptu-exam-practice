import { Router } from "express";
import { examController } from "../controllers/exam.controllers";
import { authenticate, identify } from "../middlewares/auth.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { idParam } from "../rules/requests/admin.request";
import { submitAttemptBody } from "../rules/requests/attempt.request";
import { paginationQuery } from "../utils/pagination";

const examRouter = Router();

// Khách xem được kho đề của chính mình (theo X-Guest-Id); nộp bài lưu lịch sử và nhận đề về tài khoản thì cần đăng nhập
examRouter.get("/", identify, validate(paginationQuery, "query"), examController.listMine);
examRouter.post("/claim", authenticate, examController.claim);
examRouter.get("/:id", identify, validate(idParam, "params"), examController.get);
examRouter.post("/:id/attempts", authenticate, validate(idParam, "params"), validate(submitAttemptBody), examController.submitAttempt);

export default examRouter;
