import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import { actorOf } from "../utils/actor";
import { ResponseClient } from "../rules/response";
import type { FsrsDueQuery, FsrsReviewBody } from "../rules/requests/fsrs-review.request";
import { fsrsReviewService } from "../services/fsrs-review.service";

export const fsrsReviewController = {
  // Ghi một lần ôn, trả hạn ôn kế tiếp
  async submit(req: Request, res: Response) {
    res.json(new ResponseClient({ message: "Đã lưu lần ôn", data: await fsrsReviewService.submit(actorOf(req), getValidated<FsrsReviewBody>(res)) }));
  },

  // Câu đến hạn ôn, sớm nhất trước
  async due(req: Request, res: Response) {
    const { limit } = getValidated<FsrsDueQuery>(res, "query");
    res.json(new ResponseClient({ data: await fsrsReviewService.due(actorOf(req), limit) }));
  },
};
