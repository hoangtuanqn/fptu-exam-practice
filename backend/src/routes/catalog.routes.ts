import { Router } from "express";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { identify } from "../middlewares/auth.middlewares";
import { getValidated, validate } from "../middlewares/validate.middlewares";
import { type CatalogExamsQuery, catalogExamsQuery } from "../rules/requests/catalog.request";
import { ResponseClient } from "../rules/response";
import { catalogService } from "../services/catalog.service";

// Kho đề theo môn: danh sách đề FE, PE, Quiz... (FuOverflow + hệ thống). Khách cũng xem được danh sách; lấy đề thì đi qua luồng lấy đề thông thường (có phí như cũ).
const catalogRouter = Router();
catalogRouter.use(makeLimiter({ limit: 90 }));
catalogRouter.use(identify);

catalogRouter.get("/subjects", async (_req, res) => {
  res.json(new ResponseClient({ data: await catalogService.subjects() }));
});

// Số liệu tổng quan của Thư viện đề thi (công khai): tổng môn/đề, phân theo kỳ học
catalogRouter.get("/overview", async (_req, res) => {
  res.json(new ResponseClient({ data: await catalogService.overview() }));
});

// Đề mới đăng gần đây (mọi môn), cho khối "Mới đăng" ở trang chủ; khách cũng xem được
catalogRouter.get("/latest", async (_req, res) => {
  res.json(new ResponseClient({ data: await catalogService.latest() }));
});

// Các môn người dùng đã lấy đề (để bấm nhanh); khách chưa có kho nên trả rỗng
catalogRouter.get("/my-subjects", async (req, res) => {
  res.json(new ResponseClient({ data: req.user ? await catalogService.mySubjects(req.user.id) : [] }));
});

catalogRouter.get("/exams", validate(catalogExamsQuery, "query"), async (req, res) => {
  const { subject, ...query } = getValidated<CatalogExamsQuery>(res, "query");
  res.json(new ResponseClient({ data: await catalogService.exams(subject, query, req.user?.id ?? null) }));
});

export default catalogRouter;
