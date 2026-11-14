import type { Request, Response } from "express";
import { HTTP_STATUS } from "../constants/httpStatus";
import { getValidated } from "../middlewares/validate.middlewares";
import type { IdParam } from "../rules/requests/admin.request";
import type { AttachmentParam, AttachmentQuery, ListExamsQuery } from "../rules/requests/exam.request";
import type { SubmitAttemptBody, ThreadParam } from "../rules/requests/attempt.request";
import { hasTopicReport, hasUnlimitedReview } from "../utils/pro";
import { AppError } from "../rules/error";
import { ResponseClient } from "../rules/response";
import { attemptService } from "../services/attempt.service";
import { examService } from "../services/exam.service";
import { actorOf } from "../utils/actor";
import { attachmentHeaders } from "../utils/attachment";

export const examController = {
  async listMine(req: Request, res: Response) {
    const { items, meta } = await examService.listMine(actorOf(req).owner, getValidated<ListExamsQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },

  async get(req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    res.json(new ResponseClient({ data: await examService.getDetail(actorOf(req), id) }));
  },

  async claim(req: Request, res: Response) {
    const data = await examService.claimGuestLibrary(req.user!.id, req.guestId);
    res.json(new ResponseClient({ data }));
  },

  async answers(req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    res.json(new ResponseClient({ data: await examService.getAnswers(actorOf(req), id) }));
  },

  async retrySolve(req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    res.json(new ResponseClient({ data: await examService.retrySolve(actorOf(req), id) }));
  },

  // Stream tệp (sendFile hỗ trợ Range cho video). nosniff đã có từ helmet; đặt lại cho chắc vì đây là nội dung từ bên ngoài.
  async attachment(req: Request, res: Response) {
    const { examId, attachmentId } = getValidated<AttachmentParam>(res, "params");
    const { download } = getValidated<AttachmentQuery>(res, "query");
    const file = await examService.getAttachmentFile(examId, attachmentId);
    res.set({
      ...attachmentHeaders(file.name, file.filePath, download === "1"),
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "cross-origin", // web khác origin nhúng được pdf/video như ảnh đề
      "Cache-Control": "private, max-age=86400",
    });
    await new Promise<void>((resolve, reject) =>
      res.sendFile(file.abs, { dotfiles: "allow" }, (err) => (err && !res.headersSent ? reject(AppError.notFound("Không tìm thấy tệp")) : resolve())),
    );
  },

  async getByThread(req: Request, res: Response) {
    const { threadId } = getValidated<ThreadParam>(res, "params");
    res.json(new ResponseClient({ data: await examService.getDetailByThread(actorOf(req), threadId) }));
  },

  async submitAttempt(req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    const data = await attemptService.submit(actorOf(req), id, getValidated<SubmitAttemptBody>(res), { unlimitedReview: hasUnlimitedReview(req.user), topicReport: hasTopicReport(req.user) });
    res.status(HTTP_STATUS.CREATED).json(new ResponseClient({ message: "Đã lưu lịch sử làm bài", data }));
  },
};
