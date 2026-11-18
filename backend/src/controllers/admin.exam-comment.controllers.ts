import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { UuidParam } from "../rules/requests/admin.request";
import type { BulkReviewCommentsBody, ListAdminCommentsQuery, ReviewCommentBody } from "../rules/requests/exam-comment.request";
import { ResponseClient } from "../rules/response";
import { examCommentService } from "../services/exam-comment.service";

const REVIEWED = { APPROVED: "Đã duyệt bình luận", REJECTED: "Đã từ chối bình luận" } as const;

export const adminExamCommentController = {
  async list(_req: Request, res: Response) {
    const { items, meta } = await examCommentService.adminList(getValidated<ListAdminCommentsQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },

  async summary(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await examCommentService.adminSummary() }));
  },

  async review(req: Request, res: Response) {
    const { id } = getValidated<UuidParam>(res, "params");
    const body = getValidated<ReviewCommentBody>(res);
    res.json(new ResponseClient({ message: REVIEWED[body.status], data: await examCommentService.review(req.user!.id, id, body) }));
  },

  async bulkReview(req: Request, res: Response) {
    const body = getValidated<BulkReviewCommentsBody>(res);
    res.json(new ResponseClient({ message: REVIEWED[body.status], data: await examCommentService.bulkReview(req.user!.id, body) }));
  },

  async remove(_req: Request, res: Response) {
    const { id } = getValidated<UuidParam>(res, "params");
    res.json(new ResponseClient({ message: "Đã xoá bình luận", data: await examCommentService.adminRemove(id) }));
  },
};
