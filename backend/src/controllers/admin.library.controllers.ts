import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import { subjectCodeOnlyParam, subjectSemesterBody } from "../rules/requests/library.request";
import { ResponseClient } from "../rules/response";
import { libraryService } from "../services/library.service";
import type { z } from "zod";

export const adminLibraryController = {
  async board(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await libraryService.semesterBoard() }));
  },
  async setSemester(_req: Request, res: Response) {
    const { code } = getValidated<z.infer<typeof subjectCodeOnlyParam>>(res, "params");
    const { semester } = getValidated<z.infer<typeof subjectSemesterBody>>(res);
    res.json(new ResponseClient({ message: "Đã cập nhật kỳ của môn", data: await libraryService.setSubjectSemester(code, semester) }));
  },
};
