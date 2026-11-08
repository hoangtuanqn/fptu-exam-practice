import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { identify } from "../middlewares/auth.middlewares";
import { getValidated, validate } from "../middlewares/validate.middlewares";
import { frequentQuestionsService } from "../services/frequent-questions.service";
import { prisma } from "../configs/prisma";
import { ResponseClient } from "../rules/response";

// Danh sách môn (mã + tên) để người dùng chọn môn khi tạo bộ đề theo chương. Công khai, ít thay đổi nên cho trình duyệt nhớ 10 phút.
const subjectRouter = Router();

subjectRouter.get("/", async (_req, res) => {
  const items = await prisma.subject.findMany({ orderBy: { code: "asc" }, select: { code: true, name: true } });
  res.set("Cache-Control", "public, max-age=600").json(new ResponseClient({ data: items }));
});

// Câu hay ra của một môn (lặp lại ở nhiều đề). Khách cũng xem được phần xem thử; Pro xem đủ.
const codeParam = z.object({ code: z.string().regex(/^[A-Za-z]{2,4}\d{3}[A-Za-z]?$/, "Mã môn không hợp lệ") });
const frequentLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { status: false, message: "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút" } });
subjectRouter.get("/:code/frequent", frequentLimiter, identify, validate(codeParam, "params"), async (req, res) => {
  const { code } = getValidated<z.infer<typeof codeParam>>(res, "params");
  res.json(new ResponseClient({ data: await frequentQuestionsService.forSubject(code, req.user) }));
});

export default subjectRouter;
