import { Router } from "express";
import { prisma } from "../configs/prisma";
import { ResponseClient } from "../rules/response";

// Danh sách môn (mã + tên) để người dùng chọn môn khi tạo bộ đề theo chương. Công khai, ít thay đổi nên cho trình duyệt nhớ 10 phút.
const subjectRouter = Router();

subjectRouter.get("/", async (_req, res) => {
  const items = await prisma.subject.findMany({ orderBy: { code: "asc" }, select: { code: true, name: true } });
  res.set("Cache-Control", "public, max-age=600").json(new ResponseClient({ data: items }));
});

export default subjectRouter;
