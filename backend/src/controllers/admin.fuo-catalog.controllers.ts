import type { Request, Response } from "express";
import { HTTP_STATUS } from "../constants/httpStatus";
import { ResponseClient } from "../rules/response";
import { fuoCatalogService } from "../services/fuo-catalog.service";

export const adminFuoCatalogController = {
  async status(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await fuoCatalogService.status() }));
  },

  // Trả về ngay (202), việc quét chạy nền
  async start(req: Request, res: Response) {
    const data = await fuoCatalogService.start(req.user!.id);
    res.status(HTTP_STATUS.ACCEPTED).json(new ResponseClient({ message: "Đã bắt đầu quét danh mục FuOverflow", data }));
  },
};
