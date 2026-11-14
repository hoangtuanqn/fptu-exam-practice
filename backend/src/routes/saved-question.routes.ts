import { Router } from "express";
import { savedQuestionController } from "../controllers/saved-question.controllers";
import { authenticate } from "../middlewares/auth.middlewares";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { savedExamParams, savedListQuery, savedQuestionParams, saveQuestionBody } from "../rules/requests/saved-question.request";

// Câu đã lưu để xem lại (chỉ thành viên)
const savedQuestionRouter = Router();
savedQuestionRouter.use(authenticate, makeLimiter({ limit: 240 }));

savedQuestionRouter.get("/", validate(savedListQuery, "query"), savedQuestionController.list);
savedQuestionRouter.get("/exam/:examId", validate(savedExamParams, "params"), savedQuestionController.ofExam);
savedQuestionRouter.post("/", validate(saveQuestionBody), savedQuestionController.save);
savedQuestionRouter.delete("/:examId/:number", validate(savedQuestionParams, "params"), savedQuestionController.remove);

export default savedQuestionRouter;
