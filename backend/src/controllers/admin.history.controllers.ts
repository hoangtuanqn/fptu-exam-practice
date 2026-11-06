import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { ListAttemptsQuery, ListCrawlJobsQuery, ListPurchasesQuery, ListWalletQuery } from "../rules/requests/admin-history.request";
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

  async peDownloads(_req: Request, res: Response) {
    const { items, meta } = await adminHistoryService.peDownloads(getValidated<ListPurchasesQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },

  async explanationUnlocks(_req: Request, res: Response) {
    const { items, meta } = await adminHistoryService.explanationUnlocks(getValidated<ListPurchasesQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },

  async explanationPurchases(_req: Request, res: Response) {
    const { items, meta } = await adminHistoryService.explanationPurchases(getValidated<ListPurchasesQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },
};
