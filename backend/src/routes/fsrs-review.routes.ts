import { Router } from "express";
import { fsrsReviewController } from "../controllers/fsrs-review.controllers";
import { authenticate } from "../middlewares/auth.middlewares";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { fsrsDueQuery, fsrsReviewBody } from "../rules/requests/fsrs-review.request";

// Lịch ôn FSRS theo từng câu (khác /review là Sổ câu sai kiểu Leitner)
const fsrsReviewRouter = Router();
fsrsReviewRouter.use(authenticate, makeLimiter({ limit: 240 }));

fsrsReviewRouter.post("/", validate(fsrsReviewBody), fsrsReviewController.submit);
fsrsReviewRouter.get("/due", validate(fsrsDueQuery, "query"), fsrsReviewController.due);

export default fsrsReviewRouter;
