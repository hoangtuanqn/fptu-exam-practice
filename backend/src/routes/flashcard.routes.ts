import { Router } from "express";
import { flashcardController } from "../controllers/flashcard.controllers";
import { optionalAuthenticate } from "../middlewares/auth.middlewares";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { flashcardImageParam } from "../rules/requests/flashcard.request";
import { subjectCodeParam } from "../rules/requests/subject.request";

// Flashcard theo môn (công khai: khách xem trước, Pro xem đủ)
const flashcardRouter = Router();

// Ảnh: quyền xem nằm ở chữ ký của link (do máy chủ cấp), không cần đăng nhập. Nới giới hạn vì nhiều sinh viên dùng chung một mạng và chuyển câu liên tục.
flashcardRouter.get("/images/:code/:file", makeLimiter({ limit: 1500, message: "Bạn xem ảnh quá nhanh." }), validate(flashcardImageParam, "params"), flashcardController.image);

flashcardRouter.use(makeLimiter({ limit: 120 }), optionalAuthenticate);
flashcardRouter.get("/subjects", flashcardController.subjects);
flashcardRouter.get("/subjects/:code", validate(subjectCodeParam, "params"), flashcardController.subject);

export default flashcardRouter;
