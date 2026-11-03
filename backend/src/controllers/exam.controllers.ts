import type { Request, Response } from "express";
import { HTTP_STATUS } from "../constants/httpStatus";
import { getValidated } from "../middlewares/validate.middlewares";
import type { IdParam } from "../rules/requests/admin.request";
import type { SubmitAttemptBody } from "../rules/requests/attempt.request";
import { ResponseClient } from "../rules/response";
import { attemptService } from "../services/attempt.service";
import { examService } from "../services/exam.service";
import { actorOf } from "../utils/actor";
import type { PaginationQuery } from "../utils/pagination";

export const examController = {
  async listMine(req: Request, res: Response) {
    const { items, meta } = await examService.listMine(actorOf(req).owner, getValidated<PaginationQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },

  async get(req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    res.json(new ResponseClient({ data: await examService.getDetail(actorOf(req), id) }));
  },

  async claim(req: Request, res: Response) {
    const data = await examService.claimGuestLibrary(req.user!.id, req.guestId);
    res.json(new ResponseClient({ data }));
  },

  async submitAttempt(req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    const data = await attemptService.submit(actorOf(req), id, getValidated<SubmitAttemptBody>(res));
    res.status(HTTP_STATUS.CREATED).json(new ResponseClient({ message: "Đã lưu lịch sử làm bài", data }));
  },
};
