import { Router, type RequestHandler } from "express";
import { examController } from "../controllers/exam.controllers";
import { examCommentController } from "../controllers/exam-comment.controllers";
import { practiceSessionController } from "../controllers/practice-session.controllers";
import { authenticate, identify, requireVerifiedMember } from "../middlewares/auth.middlewares";
import { drainBeforeError } from "../middlewares/drain.middlewares";
import { commentFileLimiter, examCommentLimiter, examLikeLimiter, examMentionLimiter, examVoteLimiter } from "../middlewares/rateLimit.middlewares";
import { uploadCommentFiles } from "../middlewares/upload.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { uuidParam } from "../rules/requests/admin.request";
import { submitAttemptBody } from "../rules/requests/attempt.request";
import { attachmentParam, attachmentQuery, listExamsQuery } from "../rules/requests/exam.request";
import { createSessionBody } from "../rules/requests/session.request";
import {
  commentFileParam,
  commentParam,
  createCommentBody,
  createCommentForm,
  likeBody,
  listCommentsQuery,
  listRepliesQuery,
  mentionsQuery,
  reactionBody,
  questionParam,
  reportCommentBody,
  voteBody,
  voteParam,
} from "../rules/requests/exam-comment.request";

const examRouter = Router();

// Gửi bình luận: JSON như cũ, hoặc multipart/form-data có tệp ở trường "files" (các trường chữ là chuỗi, xem createCommentForm)
const validateCreateComment: RequestHandler = (req, res, next) => validate(req.is("multipart/form-data") ? createCommentForm : createCommentBody)(req, res, next);

// Khách xem được kho đề của chính mình (theo X-Guest-Id); nộp bài lưu lịch sử và nhận đề về tài khoản thì cần đăng nhập
examRouter.get("/", identify, validate(listExamsQuery, "query"), examController.listMine);
examRouter.post("/claim", authenticate, examController.claim);
examRouter.get("/:id/answers", identify, validate(uuidParam, "params"), examController.answers);
examRouter.post("/:id/opened", identify, validate(uuidParam, "params"), examController.opened);
examRouter.post("/:id/retry-solve", identify, validate(uuidParam, "params"), examController.retrySolve);
// Tệp đính kèm: mở bằng link thường (không gửi được token) nên công khai như ảnh đề ở /api/v1/files
examRouter.get("/:examId/attachments/:attachmentId", validate(attachmentParam, "params"), validate(attachmentQuery, "query"), examController.attachment);
examRouter.get("/:id", identify, validate(uuidParam, "params"), examController.get);
examRouter.post("/:id/attempts", authenticate, validate(uuidParam, "params"), validate(submitAttemptBody), examController.submitAttempt);
// Mỗi lần bấm làm bài tạo một lượt mới (khách cũng có), lưu tiến độ để tải lại trang làm tiếp được
examRouter.post("/:id/sessions", identify, validate(uuidParam, "params"), validate(createSessionBody), practiceSessionController.create);
// Bình luận theo câu: khách xem được bình luận đã duyệt; gửi, bình chọn, thích, báo cáo cần tài khoản đã xác minh email (lọc tự động, nghi ngờ thì chờ duyệt)
examRouter.get("/:id/comments", identify, validate(uuidParam, "params"), validate(listCommentsQuery, "query"), examCommentController.list);
examRouter.get("/:id/comment-counts", identify, validate(uuidParam, "params"), examCommentController.counts);
// Lỗi trước khi đọc hết thân (401, 403, 413...): đọc bỏ phần thân còn lại rồi mới trả lời (drainBeforeError)
examRouter.post("/:id/comments", authenticate, requireVerifiedMember, examCommentLimiter, validate(uuidParam, "params"), uploadCommentFiles, validateCreateComment, examCommentController.create, drainBeforeError);
// Tệp đính kèm của bình luận: link ký ngắn hạn, không cần đăng nhập (dùng được trong <img src>)
examRouter.get("/:id/comment-files/:fileId", commentFileLimiter, validate(commentFileParam, "params"), examCommentController.file);
// Gợi ý nhắc tên (@): người đã có bình luận được duyệt trong đề
examRouter.get("/:id/mentions", authenticate, requireVerifiedMember, examMentionLimiter, validate(uuidParam, "params"), validate(mentionsQuery, "query"), examCommentController.mentions);
examRouter.delete("/:id/comments/:commentId", authenticate, validate(commentParam, "params"), examCommentController.remove);
examRouter.put("/:id/comments/:commentId/like", authenticate, requireVerifiedMember, examLikeLimiter, validate(commentParam, "params"), validate(likeBody), examCommentController.like);
examRouter.put("/:id/comments/:commentId/reaction", authenticate, requireVerifiedMember, examLikeLimiter, validate(commentParam, "params"), validate(reactionBody), examCommentController.react);
examRouter.get("/:id/comments/:commentId/replies", identify, validate(commentParam, "params"), validate(listRepliesQuery, "query"), examCommentController.replies);
examRouter.post("/:id/comments/:commentId/report", authenticate, requireVerifiedMember, validate(commentParam, "params"), validate(reportCommentBody), examCommentController.report);
examRouter.get("/:id/questions/:number/reactions", identify, validate(questionParam, "params"), examCommentController.reactions);
examRouter.put("/:id/questions/:number/vote", authenticate, requireVerifiedMember, examVoteLimiter, validate(voteParam, "params"), validate(voteBody), examCommentController.vote);
examRouter.put("/:id/questions/:number/like", authenticate, requireVerifiedMember, examLikeLimiter, validate(questionParam, "params"), validate(likeBody), examCommentController.likeQuestion);

export default examRouter;
