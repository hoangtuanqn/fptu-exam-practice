import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { ImportExamBody } from "../rules/requests/crawl.request";
import { ResponseClient } from "../rules/response";
import { actorOf } from "../utils/actor";
import { crawlJobService } from "../services/crawl-job.service";

export const crawlJobController = {
  async submit(req: Request, res: Response) {
    const data = await crawlJobService.submit(actorOf(req), getValidated<ImportExamBody>(res));
    res.json(new ResponseClient({ message: "Đề đã có sẵn", data }));
  },

  // Báo giá trước khi xác nhận: phí thực tế (0 nếu đề đã trong kho của người này)
  async quote(req: Request, res: Response) {
    res.json(new ResponseClient({ data: await crawlJobService.quote(actorOf(req), getValidated<ImportExamBody>(res, "query")) }));
  },

  async price(req: Request, res: Response) {
    res.json(new ResponseClient({ data: await crawlJobService.getPrice(actorOf(req)) }));
  },
};
