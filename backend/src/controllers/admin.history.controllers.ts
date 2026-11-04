import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { ListAttemptsQuery, ListCrawlJobsQuery, ListWalletQuery } from "../rules/requests/admin-history.request";
import { ResponseClient } from "../rules/response";
import { adminHistoryService } from "../services/admin.history.service";

export const adminHistoryController = {
  async wallet(_req: Request, res: Response) {
    const { items, meta } = await adminHistoryService.wallet(getValidated<ListWalletQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },

  async crawlJobs(_req: Request, res: Response) {
    const { items, meta } = await adminHistoryService.crawlJobs(getValidated<ListCrawlJobsQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },

  async attempts(_req: Request, res: Response) {
    const { items, meta } = await adminHistoryService.attempts(getValidated<ListAttemptsQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },
};
