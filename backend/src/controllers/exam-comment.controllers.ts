import type { Request, Response } from "express";
import { HTTP_STATUS } from "../constants/httpStatus";
import { getValidated } from "../middlewares/validate.middlewares";
import type { UuidParam } from "../rules/requests/admin.request";
import type {
  CommentParam,
  CreateCommentBody,
  LikeBody,
  ListCommentsQuery,
  ListRepliesQuery,
  ReactionBody,
  QuestionParam,
  ReportCommentBody,
  VoteBody,
} from "../rules/requests/exam-comment.request";
import { ResponseClient } from "../rules/response";
import { examCommentService } from "../services/exam-comment.service";
import { examReactionService } from "../services/exam-reaction.service";
import { actorOf } from "../utils/actor";

// Bình luận, bình chọn đáp án, thích theo câu của đề: người có đề trong kho xem được, thành viên đã xác minh mới gửi
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
    const data = await examCommentService.create(actorOf(req), req.user!, id, getValidated<CreateCommentBody>(res));
    const message = data.status === "APPROVED" ? "Đã gửi bình luận" : "Đã gửi bình luận, bình luận sẽ hiện với mọi người sau khi được duyệt";
    res.status(HTTP_STATUS.CREATED).json(new ResponseClient({ message, data }));
  },

  async remove(req: Request, res: Response) {
    const { id, commentId } = getValidated<CommentParam>(res, "params");
    res.json(new ResponseClient({ message: "Đã xoá bình luận", data: await examCommentService.removeOwn(req.user!.id, id, commentId) }));
  },

  async like(req: Request, res: Response) {
    const { id, commentId } = getValidated<CommentParam>(res, "params");
    const { liked } = getValidated<LikeBody>(res);
    res.json(new ResponseClient({ data: await examCommentService.like(actorOf(req), req.user!, id, commentId, liked) }));
  },

  async react(req: Request, res: Response) {
    const { id, commentId } = getValidated<CommentParam>(res, "params");
    const { reaction } = getValidated<ReactionBody>(res);
    res.json(new ResponseClient({ data: await examCommentService.react(actorOf(req), req.user!, id, commentId, reaction) }));
  },

  async replies(req: Request, res: Response) {
    const { id, commentId } = getValidated<CommentParam>(res, "params");
    const { items, meta } = await examCommentService.replies(actorOf(req), req.user?.id ?? null, id, commentId, getValidated<ListRepliesQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },

  async report(req: Request, res: Response) {
    const { id, commentId } = getValidated<CommentParam>(res, "params");
    const { reason } = getValidated<ReportCommentBody>(res);
    const data = await examCommentService.report(actorOf(req), req.user!.id, id, commentId, reason ?? null);
    res.json(new ResponseClient({ message: "Đã gửi báo cáo, cảm ơn bạn", data }));
  },

  async reactions(req: Request, res: Response) {
    const { id, number } = getValidated<QuestionParam>(res, "params");
    res.json(new ResponseClient({ data: await examReactionService.reactions(actorOf(req), req.user?.id ?? null, id, number) }));
  },

  async vote(req: Request, res: Response) {
    const { id, number } = getValidated<QuestionParam>(res, "params");
    const { answers } = getValidated<VoteBody>(res);
    res.json(new ResponseClient({ data: await examReactionService.vote(actorOf(req), req.user!.id, id, number, answers) }));
  },

  async likeQuestion(req: Request, res: Response) {
    const { id, number } = getValidated<QuestionParam>(res, "params");
    const { liked } = getValidated<LikeBody>(res);
    res.json(new ResponseClient({ data: await examReactionService.like(actorOf(req), req.user!.id, id, number, liked) }));
  },
};
