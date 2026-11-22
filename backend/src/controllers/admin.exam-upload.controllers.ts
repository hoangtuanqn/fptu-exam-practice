import type { Request, Response } from "express";
import { HTTP_STATUS } from "../constants/httpStatus";
import { getValidated } from "../middlewares/validate.middlewares";
import type { UuidParam } from "../rules/requests/admin.request";
import type { ExamGapFilter, ExamGapsQuery, UpdateExamImagesBody, UploadExamBody } from "../rules/requests/exam-upload.request";
import { ResponseClient } from "../rules/response";
import { adminExamUploadService } from "../services/admin.exam-upload.service";

const filesOf = (req: Request) => (Array.isArray(req.files) ? req.files : []);

export const adminExamUploadController = {
  async upload(req: Request, res: Response) {
    const data = await adminExamUploadService.create(req.user!.id, getValidated<UploadExamBody>(res), filesOf(req));
    res.status(data.created ? HTTP_STATUS.CREATED : HTTP_STATUS.OK).json(new ResponseClient({ message: `Đã lưu đề ${data.questions} câu`, data }));
  },

  async updateImages(req: Request, res: Response) {
    const { id } = getValidated<UuidParam>(res, "params");
    const data = await adminExamUploadService.updateImages(req.user!.id, id, getValidated<UpdateExamImagesBody>(res), filesOf(req));
    res.json(new ResponseClient({ message: `Đã cập nhật ${data.replaced.length + data.added.length} ảnh`, data }));
  },

  async gaps(_req: Request, res: Response) {
    const { items, meta } = await adminExamUploadService.gaps(getValidated<ExamGapsQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },

  async gapSummary(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await adminExamUploadService.gapSummary(getValidated<ExamGapFilter>(res, "query")) }));
  },
};
