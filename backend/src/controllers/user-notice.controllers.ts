import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { ReadNoticeIdsBody } from "../rules/requests/user-notice.request";
import { ResponseClient } from "../rules/response";
import { userNoticeService } from "../services/user-notice.service";
import type { PaginationQuery } from "../utils/pagination";

export const userNoticeController = {
  async list(req: Request, res: Response) {
    const { items, meta } = await userNoticeService.list(req.user!.id, getValidated<PaginationQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },

  async unreadCount(req: Request, res: Response) {
    res.json(new ResponseClient({ data: await userNoticeService.unreadCount(req.user!.id) }));
  },

  async read(req: Request, res: Response) {
    const { ids } = getValidated<ReadNoticeIdsBody>(res);
    res.json(new ResponseClient({ data: await userNoticeService.markRead(req.user!.id, ids) }));
  },

  async readAll(req: Request, res: Response) {
    res.json(new ResponseClient({ data: await userNoticeService.markRead(req.user!.id) }));
  },
};
