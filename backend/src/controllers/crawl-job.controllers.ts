import type { Request, Response } from "express";
import { HTTP_STATUS } from "../constants/httpStatus";
import { getValidated } from "../middlewares/validate.middlewares";
import type { IdParam } from "../rules/requests/admin.request";
import type { ImportExamBody } from "../rules/requests/crawl.request";
import { ResponseClient } from "../rules/response";
import { actorOf } from "../utils/actor";
import { crawlJobService } from "../services/crawl-job.service";

export const crawlJobController = {
  async submit(req: Request, res: Response) {
    const data = await crawlJobService.submit(actorOf(req), getValidated<ImportExamBody>(res));
    // 200: đề đã có sẵn; 202: đã nhận, đang xử lý nền
    res
      .status(data.existed ? HTTP_STATUS.OK : HTTP_STATUS.ACCEPTED)
      .json(new ResponseClient({ message: data.existed ? "Đề đã có sẵn" : "Đã nhận, đang xử lý", data }));
  },

  // Báo giá trước khi xác nhận: phí thực tế (0 nếu đề người này đã lấy rồi)
  async quote(req: Request, res: Response) {
    res.json(new ResponseClient({ data: await crawlJobService.quote(actorOf(req), getValidated<ImportExamBody>(res, "query")) }));
  },

  async price(req: Request, res: Response) {
    res.json(new ResponseClient({ data: await crawlJobService.getPrice(actorOf(req)) }));
  },

  async get(req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    res.json(new ResponseClient({ data: await crawlJobService.getForActor(id, actorOf(req)) }));
  },
};
