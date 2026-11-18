import type { Request, Response } from "express";
import { HTTP_STATUS } from "../constants/httpStatus";
import { getValidated } from "../middlewares/validate.middlewares";
import type { UuidParam } from "../rules/requests/admin.request";
import type { CommentParam, CreateCommentBody, ListCommentsQuery } from "../rules/requests/exam-comment.request";
import { ResponseClient } from "../rules/response";
import { examCommentService } from "../services/exam-comment.service";
import { actorOf } from "../utils/actor";

// Bình luận theo câu của đề: khách xem được, thành viên gửi/xoá bình luận của mình
export const examCommentController = {
  async list(req: Request, res: Response) {
    const { id } = getValidated<UuidParam>(res, "params");
    const { items, meta } = await examCommentService.list(actorOf(req), req.user?.id ?? null, id, getValidated<ListCommentsQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },

  async counts(req: Request, res: Response) {
    const { id } = getValidated<UuidParam>(res, "params");
    res.json(new ResponseClient({ data: await examCommentService.counts(actorOf(req), id) }));
  },

  async create(req: Request, res: Response) {
    const { id } = getValidated<UuidParam>(res, "params");
    const data = await examCommentService.create(actorOf(req), req.user!.id, id, getValidated<CreateCommentBody>(res));
    res.status(HTTP_STATUS.CREATED).json(new ResponseClient({ message: "Đã gửi bình luận, bình luận sẽ hiện với mọi người sau khi được duyệt", data }));
  },

  async remove(req: Request, res: Response) {
    const { id, commentId } = getValidated<CommentParam>(res, "params");
    res.json(new ResponseClient({ message: "Đã xoá bình luận", data: await examCommentService.removeOwn(req.user!.id, id, commentId) }));
  },
};
