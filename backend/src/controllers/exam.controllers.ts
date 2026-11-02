import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { IdParam } from "../rules/requests/admin.request";
import { ResponseClient } from "../rules/response";
import { examService } from "../services/exam.service";

export const examController = {
  async get(_req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    res.json(new ResponseClient({ data: await examService.getDetail(id) }));
  },
};
