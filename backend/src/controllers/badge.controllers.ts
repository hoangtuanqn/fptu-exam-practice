import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { SetBadgePinsBody } from "../rules/requests/badge.request";
import { ResponseClient } from "../rules/response";
import { badgeService } from "../services/badge.service";

export const badgeController = {
  async mine(req: Request, res: Response) {
    res.json(new ResponseClient({ data: await badgeService.mine(req.user!.id) }));
  },

  async setPins(req: Request, res: Response) {
    const { keys } = getValidated<SetBadgePinsBody>(res);
    res.json(new ResponseClient({ message: "Đã cập nhật huy hiệu ghim", data: await badgeService.setPins(req.user!.id, keys) }));
  },

  // Admin
  async stats(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await badgeService.adminStats() }));
  },
};
