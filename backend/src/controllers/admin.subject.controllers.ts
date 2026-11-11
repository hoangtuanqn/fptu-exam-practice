import type { Request, Response } from "express";
import type { z } from "zod";
import { getValidated } from "../middlewares/validate.middlewares";
import { subjectCodeOnlyParam, updateSubjectBody } from "../rules/requests/library.request";
import { ResponseClient } from "../rules/response";
import { adminSubjectService } from "../services/admin-subject.service";

const codeOf = (res: Response) => getValidated<z.infer<typeof subjectCodeOnlyParam>>(res, "params").code;

export const adminSubjectController = {
  async list(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await adminSubjectService.list() }));
  },
  async detail(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await adminSubjectService.detail(codeOf(res)) }));
  },
  async update(_req: Request, res: Response) {
    const body = getValidated<z.infer<typeof updateSubjectBody>>(res);
    res.json(new ResponseClient({ message: "Đã lưu thông tin môn", data: await adminSubjectService.update(codeOf(res), body) }));
  },
  async clearInferred(_req: Request, res: Response) {
    res.json(new ResponseClient({ message: "Đã xóa bộ chương AI suy, lần sau sẽ suy lại", data: await adminSubjectService.clearInferred(codeOf(res)) }));
  },
};
