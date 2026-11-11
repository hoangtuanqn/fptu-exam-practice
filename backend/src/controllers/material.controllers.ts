import type { NextFunction, Request, Response } from "express";
import { HTTP_STATUS } from "../constants/httpStatus";
import { getValidated } from "../middlewares/validate.middlewares";
import { AppError } from "../rules/error";
import type { MaterialIdParam, MaterialUploadBody } from "../rules/requests/material.request";
import { ResponseClient } from "../rules/response";
import { materialService, type MaterialActor } from "../services/material.service";

const actor = (req: Request): MaterialActor => {
  if (!req.user) throw AppError.unauthorized();
  return { id: req.user.id, role: req.user.role };
};

export const materialController = {
  // Phần trăm đã dùng trong cửa sổ hiện tại và lúc bắt đầu hồi lại
  async quota(req: Request, res: Response) {
    res.json(new ResponseClient({ data: await materialService.quota(actor(req)) }));
  },

  // Chạy trước multer: chặn tài khoản không dùng được tính năng trước khi đọc tệp
  async gate(req: Request, _res: Response, next: NextFunction) {
    await materialService.assertCanUpload(actor(req));
    next();
  },

  // Nhận PDF và xếp hàng phân tích (chạy nền)
  async create(req: Request, res: Response) {
    const { subjectCode } = getValidated<MaterialUploadBody>(res);
    const data = await materialService.create(actor(req), req.file, subjectCode);
    res.status(HTTP_STATUS.ACCEPTED).json(new ResponseClient({ message: data.duplicate ? "Tài liệu này đã được tải lên trước đó" : "Đã nhận tài liệu, đang chờ phân tích", data }));
  },

  async list(req: Request, res: Response) {
    res.json(new ResponseClient({ data: await materialService.list(actor(req)) }));
  },

  async detail(req: Request, res: Response) {
    const { id } = getValidated<MaterialIdParam>(res, "params");
    res.json(new ResponseClient({ data: await materialService.get(actor(req), id) }));
  },

  async remove(req: Request, res: Response) {
    const { id } = getValidated<MaterialIdParam>(res, "params");
    await materialService.remove(actor(req), id);
    res.status(HTTP_STATUS.NO_CONTENT).end();
  },
};
