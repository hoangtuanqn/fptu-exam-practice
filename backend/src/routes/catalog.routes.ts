import { Router } from "express";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { z } from "zod";
import { identify } from "../middlewares/auth.middlewares";
import { getValidated, validate } from "../middlewares/validate.middlewares";
import { subjectCodeSchema } from "../rules/requests/subject.request";
import { ResponseClient } from "../rules/response";
import { catalogService } from "../services/catalog.service";
import { paginationQuery } from "../utils/pagination";

// Kho đề theo môn: danh sách đề FE (FuOverflow + hệ thống). Khách cũng xem được danh sách; lấy đề thì đi qua luồng lấy đề thông thường (có phí như cũ).
const catalogRouter = Router();
catalogRouter.use(makeLimiter({ limit: 90 }));
catalogRouter.use(identify);

catalogRouter.get("/subjects", async (_req, res) => {
  res.json(new ResponseClient({ data: await catalogService.subjects() }));
});

// Đề mới đăng gần đây (mọi môn), cho khối "Mới đăng" ở trang chủ; khách cũng xem được
catalogRouter.get("/latest", async (_req, res) => {
  res.json(new ResponseClient({ data: await catalogService.latest() }));
});

// Các môn người dùng đã lấy đề (để bấm nhanh); khách chưa có kho nên trả rỗng
catalogRouter.get("/my-subjects", async (req, res) => {
  res.json(new ResponseClient({ data: req.user ? await catalogService.mySubjects(req.user.id) : [] }));
});

const examsQuery = paginationQuery.extend({
  subject: subjectCodeSchema,
  q: z.string().trim().max(60).optional(),
  term: z.string().regex(/^(SP|SU|FA)\d{2}$/i, "Kỳ không hợp lệ").transform((t) => t.toUpperCase()).optional(),
});
catalogRouter.get("/exams", validate(examsQuery, "query"), async (req, res) => {
  const { subject, ...query } = getValidated<z.infer<typeof examsQuery>>(res, "query");
  res.json(new ResponseClient({ data: await catalogService.exams(subject, query, req.user?.id ?? null) }));
});

export default catalogRouter;
