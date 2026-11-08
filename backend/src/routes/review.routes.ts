import { Router } from "express";
import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middlewares/auth.middlewares";
import { getValidated, validate } from "../middlewares/validate.middlewares";
import { idParam, type IdParam } from "../rules/requests/admin.request";
import {
  reviewAnswerBody,
  reviewListQuery,
  reviewQueueQuery,
  studyGoalBody,
  type ReviewAnswerBody,
  type ReviewListQuery,
  type ReviewQueueQuery,
  type StudyGoalBody,
} from "../rules/requests/review.request";
import { ResponseClient } from "../rules/response";
import { reviewService } from "../services/review.service";
import { studyService } from "../services/study.service";
import { hasUnlimitedReview } from "../utils/pro";

const limiter = rateLimit({ windowMs: 60 * 1000, limit: 240, standardHeaders: true, legacyHeaders: false, message: { status: false, message: "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút" } });

// Sổ câu sai: ôn lại theo lịch (lặp lại ngắt quãng)
const reviewRouter = Router();
reviewRouter.use(authenticate, limiter);

reviewRouter.get("/summary", async (req: Request, res: Response) => {
  res.json(new ResponseClient({ data: await reviewService.summary(req.user!.id, hasUnlimitedReview(req.user)) }));
});
reviewRouter.get("/queue", validate(reviewQueueQuery, "query"), async (req: Request, res: Response) => {
  const { all } = getValidated<ReviewQueueQuery>(res, "query");
  res.json(new ResponseClient({ data: await reviewService.queue(req.user!.id, all === "1") }));
});
reviewRouter.get("/", validate(reviewListQuery, "query"), async (req: Request, res: Response) => {
  const q = getValidated<ReviewListQuery>(res, "query");
  const { items, meta } = await reviewService.list(req.user!.id, q, q.status);
  res.json(new ResponseClient({ data: items, meta }));
});
reviewRouter.post("/:id/answer", validate(idParam, "params"), validate(reviewAnswerBody), async (req: Request, res: Response) => {
  const { id } = getValidated<IdParam>(res, "params");
  res.json(new ResponseClient({ data: await reviewService.answer(req.user!.id, id, getValidated<ReviewAnswerBody>(res).chosen) }));
});
reviewRouter.delete("/:id", validate(idParam, "params"), async (req: Request, res: Response) => {
  await reviewService.remove(req.user!.id, getValidated<IdParam>(res, "params").id);
  res.json(new ResponseClient({ message: "Đã bỏ khỏi sổ" }));
});

// Chuỗi ngày học và mục tiêu tuần
export const studyRouter = Router();
studyRouter.use(authenticate, limiter);
studyRouter.get("/stats", async (req: Request, res: Response) => {
  res.json(new ResponseClient({ data: await studyService.stats(req.user!.id) }));
});
studyRouter.put("/goal", validate(studyGoalBody), async (req: Request, res: Response) => {
  res.json(new ResponseClient({ message: "Đã lưu mục tiêu", data: await studyService.setGoal(req.user!.id, getValidated<StudyGoalBody>(res).days) }));
});

export default reviewRouter;
