import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { IdParam } from "../rules/requests/admin.request";
import { examFreeBody, subjectCodeOnlyParam, subjectSemesterBody, type UpdateLibraryBody } from "../rules/requests/library.request";
import { ResponseClient } from "../rules/response";
import { libraryService } from "../services/library.service";
import { librarySettingService } from "../services/library-setting.service";
import type { z } from "zod";

export const adminLibraryController = {
  async get(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await librarySettingService.get() }));
  },
  async update(_req: Request, res: Response) {
    res.json(new ResponseClient({ message: "Đã lưu cấu hình thư viện đề", data: await librarySettingService.update(getValidated<UpdateLibraryBody>(res)) }));
  },
  async setSemester(_req: Request, res: Response) {
    const { code } = getValidated<z.infer<typeof subjectCodeOnlyParam>>(res, "params");
    const { semester } = getValidated<z.infer<typeof subjectSemesterBody>>(res);
    res.json(new ResponseClient({ message: "Đã cập nhật kỳ của môn", data: await libraryService.setSubjectSemester(code, semester) }));
  },
  async setExamFree(_req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    const { free } = getValidated<z.infer<typeof examFreeBody>>(res);
    res.json(new ResponseClient({ message: "Đã cập nhật đề", data: await libraryService.setExamFree(id, free) }));
  },
  async setSubjectFree(_req: Request, res: Response) {
    const { code } = getValidated<z.infer<typeof subjectCodeOnlyParam>>(res, "params");
    const { free } = getValidated<z.infer<typeof examFreeBody>>(res);
    res.json(new ResponseClient({ message: "Đã cập nhật các đề của môn", data: await libraryService.setSubjectFree(code, free) }));
  },
};
