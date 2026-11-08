import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { getValidated, validate } from "../middlewares/validate.middlewares";
import { idParam, type IdParam } from "../rules/requests/admin.request";
import { ResponseClient } from "../rules/response";
import { adminInsightsService } from "../services/admin.insights.service";

const funnelQuery = z.object({ days: z.coerce.number().int().min(1).max(365).default(30) });

// Phân tích cho admin: phễu người dùng và chất lượng đề (gắn dưới /admin, đã có kiểm tra quyền ADMIN)
const adminInsightsRouter = Router();

adminInsightsRouter.get("/funnel", validate(funnelQuery, "query"), async (_req: Request, res: Response) => {
  res.json(new ResponseClient({ data: await adminInsightsService.funnel(getValidated<z.infer<typeof funnelQuery>>(res, "query").days) }));
});
adminInsightsRouter.get("/exams", async (_req: Request, res: Response) => {
  res.json(new ResponseClient({ data: await adminInsightsService.examsToReview() }));
});
adminInsightsRouter.get("/exams/:id/questions", validate(idParam, "params"), async (_req: Request, res: Response) => {
  res.json(new ResponseClient({ data: await adminInsightsService.examQuestions(getValidated<IdParam>(res, "params").id) }));
});

export default adminInsightsRouter;
