import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../configs/prisma";
import { getValidated, validate } from "../middlewares/validate.middlewares";
import { ResponseClient } from "../rules/response";

// Danh sách môn (mã + tên) để người dùng chọn môn khi tạo bộ đề theo chương. Công khai, ít thay đổi nên cho trình duyệt nhớ 10 phút.
const subjectRouter = Router();

subjectRouter.get("/", async (_req, res) => {
  const items = await prisma.subject.findMany({ orderBy: { code: "asc" }, select: { code: true, name: true } });
  res.set("Cache-Control", "public, max-age=600").json(new ResponseClient({ data: items }));
});

// Thông tin công khai của một môn cho trang /mon/<mã>: tên, các chương theo syllabus và số đề hệ thống đang có
const subjectCodeParam = z.object({ code: z.string().regex(/^[A-Za-z]{2,4}d{3}[A-Za-z]?$/, "Mã môn không hợp lệ") });
const subjectInfoLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false, message: { status: false, message: "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút" } });
subjectRouter.get("/:code", subjectInfoLimiter, validate(subjectCodeParam, "params"), async (_req, res) => {
  const { code } = getValidated<z.infer<typeof subjectCodeParam>>(res, "params");
  const subject = await prisma.subject.findUnique({ where: { code: code.toUpperCase() }, select: { code: true, name: true, chapters: { orderBy: { number: "asc" }, select: { number: true, title: true } } } });
  if (!subject) return void res.status(404).json({ status: false, message: "Không tìm thấy môn học" });
  const exams = await prisma.exam.count({ where: { title: { contains: subject.code }, answerSource: { in: ["AI", "MANUAL"] } } });
  res.json(new ResponseClient({ data: { code: subject.code, name: subject.name, chapters: subject.chapters.filter((c) => c.number > 0), exams } }));
});

export default subjectRouter;
