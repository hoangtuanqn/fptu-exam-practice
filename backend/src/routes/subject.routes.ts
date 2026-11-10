import { Router } from "express";
import { identify } from "../middlewares/auth.middlewares";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { getValidated, validate } from "../middlewares/validate.middlewares";
import { subjectCodeParam, type SubjectCodeParam } from "../rules/requests/subject.request";
import { ResponseClient } from "../rules/response";
import { frequentQuestionsService } from "../services/frequent-questions.service";
import { subjectService } from "../services/subject.service";

// Công khai: danh sách môn, thông tin một môn và "câu hay ra" của môn (khách xem được phần xem thử, Pro xem đủ)
const subjectRouter = Router();
const limiter = makeLimiter({ limit: 30 });

// Ít thay đổi nên cho trình duyệt nhớ 10 phút
subjectRouter.get("/", async (_req, res) => {
  res.set("Cache-Control", "public, max-age=600").json(new ResponseClient({ data: await subjectService.list() }));
});

// Bước chọn môn của Bộ đề theo chương: môn thiếu tên chương thì báo không làm được (và gửi báo cáo cho admin)
subjectRouter.post("/:code/chapter-set-check", makeLimiter({ limit: 10 }), validate(subjectCodeParam, "params"), async (_req, res) => {
  const { code } = getValidated<SubjectCodeParam>(res, "params");
  res.json(new ResponseClient({ data: await subjectService.chapterSetReady(code) }));
});

subjectRouter.get("/:code/frequent", limiter, identify, validate(subjectCodeParam, "params"), async (req, res) => {
  const { code } = getValidated<SubjectCodeParam>(res, "params");
  res.json(new ResponseClient({ data: await frequentQuestionsService.forSubject(code, req.user) }));
});

subjectRouter.get("/:code", limiter, validate(subjectCodeParam, "params"), async (_req, res) => {
  const { code } = getValidated<SubjectCodeParam>(res, "params");
  res.json(new ResponseClient({ data: await subjectService.info(code) }));
});

export default subjectRouter;
