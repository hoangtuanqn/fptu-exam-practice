import type { Request, Response } from "express";
import { HTTP_STATUS } from "../constants/httpStatus";
import { getValidated } from "../middlewares/validate.middlewares";
import type { CreateReportBody } from "../rules/requests/answer-report.request";
import { ResponseClient } from "../rules/response";
import { answerReportService } from "../services/answer-report.service";
import { actorOf } from "../utils/actor";
import type { PaginationQuery } from "../utils/pagination";

// Dành cho thành viên đã đăng nhập
export const answerReportController = {
  async create(req: Request, res: Response) {
    const data = await answerReportService.create(actorOf(req), req.user!.id, getValidated<CreateReportBody>(res));
    res.status(HTTP_STATUS.CREATED).json(new ResponseClient({ message: "Đã gửi báo cáo, cảm ơn bạn đã đóng góp", data }));
  },

  async mine(req: Request, res: Response) {
    const { items, meta } = await answerReportService.mine(req.user!.id, getValidated<PaginationQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },
};
