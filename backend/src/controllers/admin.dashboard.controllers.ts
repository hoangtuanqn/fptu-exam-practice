import type { Request, Response } from "express";
import { ResponseClient } from "../rules/response";
import { adminDashboardService } from "../services/admin.dashboard.service";

export const adminDashboardController = {
  async overview(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await adminDashboardService.overview() }));
  },
};
