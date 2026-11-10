import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { IdParam } from "../rules/requests/admin.request";
import { ResponseClient } from "../rules/response";
import { subjectIssueService } from "../services/subject-issue.service";

export const adminSubjectIssueController = {
  async list(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await subjectIssueService.list() }));
  },

  async resolve(_req: Request, res: Response) {
    await subjectIssueService.resolve(getValidated<IdParam>(res, "params").id);
    res.json(new ResponseClient({ message: "Đã đánh dấu xử lý xong", data: null }));
  },
};
