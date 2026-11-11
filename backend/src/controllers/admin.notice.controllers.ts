import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { IdParam } from "../rules/requests/admin.request";
import type { ListNoticesQuery, ReadAllNoticesBody, SetNoticeReadBody } from "../rules/requests/admin-notice.request";
import { ResponseClient } from "../rules/response";
import { adminNoticeService } from "../services/admin-notice.service";

export const adminNoticeController = {
  async list(_req: Request, res: Response) {
    const { status, important, category, ...page } = getValidated<ListNoticesQuery>(res, "query");
    const { items, meta } = await adminNoticeService.list(page, { status, important: important === undefined ? undefined : important === "true", category });
    res.json(new ResponseClient({ data: items, meta }));
  },

  // Chỉ các con số (cho chuông trên thanh đầu trang), nhẹ hơn nhiều so với tải cả danh sách
  async counts(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await adminNoticeService.counts() }));
  },

  async setRead(_req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    const { read } = getValidated<SetNoticeReadBody>(res);
    res.json(new ResponseClient({ data: await adminNoticeService.setRead(id, read) }));
  },

  async readAll(_req: Request, res: Response) {
    const { updated } = await adminNoticeService.readAll(getValidated<ReadAllNoticesBody>(res));
    res.json(new ResponseClient({ message: updated ? `Đã đánh dấu ${updated} thông báo là đã đọc` : "Không còn thông báo chưa đọc", data: { updated } }));
  },

  async deleteRead(_req: Request, res: Response) {
    const { deleted } = await adminNoticeService.deleteRead();
    res.json(new ResponseClient({ message: deleted ? `Đã xóa ${deleted} thông báo đã đọc` : "Không có thông báo đã đọc để xóa", data: { deleted } }));
  },
};
