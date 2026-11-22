import type { NextFunction, Request, Response } from "express";
import { HTTP_STATUS } from "../constants/httpStatus";
import { getValidated } from "../middlewares/validate.middlewares";
import type { CreateContributionBody } from "../rules/requests/exam-contribution.request";
import { ResponseClient } from "../rules/response";
import { examContributionService } from "../services/exam-contribution.service";
import type { PaginationQuery } from "../utils/pagination";

// Dành cho thành viên đã đăng nhập
export const examContributionController = {
  // Đặt trước multer: đủ số đóng góp chờ duyệt thì từ chối trước khi đọc ảnh
  async gate(req: Request, _res: Response, next: NextFunction) {
    await examContributionService.assertCanSubmit(req.user!.id);
    next();
  },

  async create(req: Request, res: Response) {
    const files = Array.isArray(req.files) ? req.files : [];
    const data = await examContributionService.create(req.user!.id, getValidated<CreateContributionBody>(res), files);
    res.status(HTTP_STATUS.CREATED).json(new ResponseClient({ message: "Đã gửi đề, cảm ơn bạn đã đóng góp. Admin sẽ xem và duyệt sớm.", data }));
  },

  async mine(req: Request, res: Response) {
    const { items, meta } = await examContributionService.mine(req.user!.id, getValidated<PaginationQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },
};
