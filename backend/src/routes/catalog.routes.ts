import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { identify } from "../middlewares/auth.middlewares";
import { getValidated, validate } from "../middlewares/validate.middlewares";
import { ResponseClient } from "../rules/response";
import { catalogService } from "../services/catalog.service";
import { paginationQuery } from "../utils/pagination";

// Kho đề theo môn: danh sách đề FE (FuOverflow + hệ thống). Khách cũng xem được danh sách; lấy đề thì đi qua luồng lấy đề thông thường (có phí như cũ).
const catalogRouter = Router();
catalogRouter.use(rateLimit({ windowMs: 60 * 1000, limit: 90, standardHeaders: true, legacyHeaders: false, message: { status: false, message: "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút" } }));
catalogRouter.use(identify);

catalogRouter.get("/subjects", async (_req, res) => {
  res.json(new ResponseClient({ data: await catalogService.subjects() }));
});

// Các môn người dùng đã lấy đề (để bấm nhanh); khách chưa có kho nên trả rỗng
catalogRouter.get("/my-subjects", async (req, res) => {
  res.json(new ResponseClient({ data: req.user ? await catalogService.mySubjects(req.user.id) : [] }));
});

const examsQuery = paginationQuery.extend({
  subject: z.string().regex(/^[A-Za-z]{2,4}\d{3}[A-Za-z]?$/, "Mã môn không hợp lệ"),
  q: z.string().trim().max(60).optional(),
  term: z.string().regex(/^(SP|SU|FA)\d{2}$/i, "Kỳ không hợp lệ").transform((t) => t.toUpperCase()).optional(),
});
catalogRouter.get("/exams", validate(examsQuery, "query"), async (req, res) => {
  const { subject, ...query } = getValidated<z.infer<typeof examsQuery>>(res, "query");
  res.json(new ResponseClient({ data: await catalogService.exams(subject, query, req.user?.id ?? null) }));
});

export default catalogRouter;
