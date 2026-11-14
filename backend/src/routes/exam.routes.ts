import { Router } from "express";
import { examController } from "../controllers/exam.controllers";
import { practiceSessionController } from "../controllers/practice-session.controllers";
import { authenticate, identify } from "../middlewares/auth.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { idParam } from "../rules/requests/admin.request";
import { submitAttemptBody, threadParam } from "../rules/requests/attempt.request";
import { attachmentParam, attachmentQuery, listExamsQuery } from "../rules/requests/exam.request";
import { createSessionBody } from "../rules/requests/session.request";

const examRouter = Router();

// Khách xem được kho đề của chính mình (theo X-Guest-Id); nộp bài lưu lịch sử và nhận đề về tài khoản thì cần đăng nhập
examRouter.get("/", identify, validate(listExamsQuery, "query"), examController.listMine);
examRouter.post("/claim", authenticate, examController.claim);
examRouter.get("/thread/:threadId", identify, validate(threadParam, "params"), examController.getByThread);
examRouter.get("/:id/answers", identify, validate(idParam, "params"), examController.answers);
examRouter.post("/:id/retry-solve", identify, validate(idParam, "params"), examController.retrySolve);
// Tệp đính kèm: mở bằng link thường (không gửi được token) nên công khai như ảnh đề ở /api/v1/files
examRouter.get("/:examId/attachments/:attachmentId", validate(attachmentParam, "params"), validate(attachmentQuery, "query"), examController.attachment);
examRouter.get("/:id", identify, validate(idParam, "params"), examController.get);
examRouter.post("/:id/attempts", authenticate, validate(idParam, "params"), validate(submitAttemptBody), examController.submitAttempt);
// Mỗi lần bấm làm bài tạo một lượt mới (khách cũng có), lưu tiến độ để tải lại trang làm tiếp được
examRouter.post("/:id/sessions", identify, validate(idParam, "params"), validate(createSessionBody), practiceSessionController.create);

export default examRouter;
