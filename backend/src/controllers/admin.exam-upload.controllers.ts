import type { Request, Response } from "express";
import { HTTP_STATUS } from "../constants/httpStatus";
import { getValidated } from "../middlewares/validate.middlewares";
import type { UuidParam } from "../rules/requests/admin.request";
import type { ExamGapFilter, ExamGapsQuery, UpdateExamImagesBody, UploadExamBody } from "../rules/requests/exam-upload.request";
import { ResponseClient } from "../rules/response";
import { adminExamUploadService } from "../services/admin.exam-upload.service";

const filesOf = (req: Request) => (Array.isArray(req.files) ? req.files : []);
// ?async=1: trả 202 ngay và xử lý nền; không có cờ thì giữ cách cũ (chờ xử lý xong mới trả lời) cho giao diện bản cũ
export const isAsyncUpload = (req: Request) => req.query.async === "1";
const queued = (res: Response, data: object) => res.status(HTTP_STATUS.ACCEPTED).json(new ResponseClient({ message: "Đã nhận đề, đang xử lý nền", data: { queued: true, ...data } }));

export const adminExamUploadController = {
  async upload(req: Request, res: Response) {
    if (isAsyncUpload(req)) return void queued(res, await adminExamUploadService.createAsync(req.user!.id, getValidated<UploadExamBody>(res), filesOf(req)));
    const data = await adminExamUploadService.create(req.user!.id, getValidated<UploadExamBody>(res), filesOf(req));
    res.status(data.created ? HTTP_STATUS.CREATED : HTTP_STATUS.OK).json(new ResponseClient({ message: `Đã lưu đề ${data.questions} câu`, data }));
  },

  async updateImages(req: Request, res: Response) {
    const { id } = getValidated<UuidParam>(res, "params");
    if (isAsyncUpload(req)) return void queued(res, await adminExamUploadService.updateImagesAsync(req.user!.id, id, getValidated<UpdateExamImagesBody>(res), filesOf(req)));
    const data = await adminExamUploadService.updateImages(req.user!.id, id, getValidated<UpdateExamImagesBody>(res), filesOf(req));
    res.json(new ResponseClient({ message: `Đã cập nhật ${data.replaced.length + data.added.length} ảnh`, data }));
  },

  async jobs(req: Request, res: Response) {
    res.json(new ResponseClient({ data: adminExamUploadService.jobs(req.user!.id) }));
  },

  async gaps(_req: Request, res: Response) {
    const { items, meta } = await adminExamUploadService.gaps(getValidated<ExamGapsQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },

  async gapSummary(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await adminExamUploadService.gapSummary(getValidated<ExamGapFilter>(res, "query")) }));
  },
};
