import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { identify } from "../middlewares/auth.middlewares";
import { getValidated, validate } from "../middlewares/validate.middlewares";
import { ResponseClient } from "../rules/response";
import { catalogService } from "../services/catalog.service";

// Thư viện đề theo môn: danh sách đề hệ thống đã có sẵn. Khách cũng xem được danh sách; lấy đề thì đi qua luồng lấy đề thông thường (có phí như cũ).
const catalogRouter = Router();
catalogRouter.use(rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false, message: { status: false, message: "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút" } }));
catalogRouter.use(identify);

catalogRouter.get("/subjects", async (_req, res) => {
  res.json(new ResponseClient({ data: await catalogService.subjects() }));
});

const examsQuery = z.object({ subject: z.string().regex(/^[A-Za-z]{2,4}\d{3}[A-Za-z]?$/, "Mã môn không hợp lệ") });
catalogRouter.get("/exams", validate(examsQuery, "query"), async (req, res) => {
  const { subject } = getValidated<z.infer<typeof examsQuery>>(res, "query");
  res.json(new ResponseClient({ data: await catalogService.exams(subject, req.user?.id ?? null) }));
});

export default catalogRouter;
