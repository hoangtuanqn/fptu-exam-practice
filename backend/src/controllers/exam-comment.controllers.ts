import type { Request, Response } from "express";
import { HTTP_STATUS } from "../constants/httpStatus";
import { getValidated } from "../middlewares/validate.middlewares";
import type { UuidParam } from "../rules/requests/admin.request";
import type {
  CommentFileParam,
  CommentParam,
  CreateCommentBody,
  LikeBody,
  ListCommentsQuery,
  ListRepliesQuery,
  MentionsQuery,
  ReactionBody,
  QuestionParam,
  ReportCommentBody,
  VoteBody,
} from "../rules/requests/exam-comment.request";
import { ResponseClient } from "../rules/response";
import { examCommentFileService } from "../services/exam-comment-file.service";
import { examCommentService } from "../services/exam-comment.service";
import { examReactionService } from "../services/exam-reaction.service";
import { AppError } from "../rules/error";
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
    // multer giữ tên tệp dạng latin1: đổi về UTF-8
    const files = (Array.isArray(req.files) ? req.files : []).map((f) => ({ name: Buffer.from(f.originalname, "latin1").toString("utf8"), buffer: f.buffer }));
    const data = await examCommentService.create(actorOf(req), req.user!, id, getValidated<CreateCommentBody>(res), files);
    const message = data.status === "APPROVED" ? "Đã gửi bình luận" : "Đã gửi bình luận, bình luận sẽ hiện với mọi người sau khi được duyệt";
    res.status(HTTP_STATUS.CREATED).json(new ResponseClient({ message, data }));
  },

  async mentions(req: Request, res: Response) {
    const { id } = getValidated<UuidParam>(res, "params");
    res.json(new ResponseClient({ data: await examCommentService.mentionCandidates(actorOf(req), req.user!.id, id, getValidated<MentionsQuery>(res, "query")) }));
  },

  /** Tệp đính kèm của bình luận: chỉ phát khi link ký còn hạn và đúng cho tệp này (link chỉ được cấp cho người xem được bình luận). */
  async file(req: Request, res: Response) {
    const { id, fileId } = getValidated<CommentFileParam>(res, "params");
    const { abs, headers } = await examCommentFileService.open(id, fileId, req.query.e, req.query.s);
    res.set({ ...headers, "Cache-Control": "private, max-age=3600", "Cross-Origin-Resource-Policy": "cross-origin" });
    await new Promise<void>((resolve, reject) => res.sendFile(abs, { dotfiles: "deny" }, (err) => (err && !res.headersSent ? reject(AppError.notFound("Không tìm thấy tệp")) : resolve())));
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
