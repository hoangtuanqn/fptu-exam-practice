import { Router } from "express";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import type { Request, Response } from "express";
import { authenticate, requireVerifiedMember } from "../middlewares/auth.middlewares";
import { idempotent } from "../middlewares/idempotency.middlewares";
import { z } from "zod";
import { PLAN_CODES } from "../constants/plan";
import { getValidated, validate } from "../middlewares/validate.middlewares";
import { idParam } from "../rules/requests/admin.request";
import { ResponseClient } from "../rules/response";
import { planService } from "../services/plan.service";

const limiter = makeLimiter({ limit: 60 });

// Bản frontend cũ không gửi body: coi như mua gói Pro như trước
const purchaseBody = z.preprocess((v) => v ?? {}, z.object({ plan: z.enum(PLAN_CODES).default("PRO") }));

const planRouter = Router();

// Công khai: trang giới thiệu gói hiện cho cả khách
planRouter.get("/", limiter, (_req: Request, res: Response) => {
  res.json(new ResponseClient({ data: planService.info() }));
});

// Mua / gia hạn: cần đăng nhập + email đã xác minh (dịch vụ trừ credit); chống bấm đúp bằng idempotent
planRouter.post("/purchase", authenticate, requireVerifiedMember, idempotent, limiter, validate(purchaseBody), async (req: Request, res: Response) => {
  const data = await planService.purchase(req.user!.id, getValidated<z.infer<typeof purchaseBody>>(res).plan);
  res.json(new ResponseClient({ message: data.renewed ? "Đã gia hạn gói Pro" : "Đã kích hoạt gói Pro", data }));
});

// Dữ kiện thật (buổi thi gần nhất, tiền đã chi lẻ) để giao diện mời Pro đúng lúc
planRouter.get("/signals", authenticate, limiter, async (req: Request, res: Response) => {
  res.json(new ResponseClient({ data: await planService.signals(req.user!.id) }));
});

// Vé Pro: mua trước, kích hoạt sau. Mua trừ credit nên cần email đã xác minh và chống bấm đúp; kích hoạt không trừ tiền nhưng cũng chống bấm đúp
planRouter.get("/tickets", authenticate, limiter, async (req: Request, res: Response) => {
  res.json(new ResponseClient({ data: await planService.tickets(req.user!.id) }));
});

planRouter.post("/tickets", authenticate, requireVerifiedMember, idempotent, limiter, validate(purchaseBody), async (req: Request, res: Response) => {
  const data = await planService.purchaseTicket(req.user!.id, getValidated<z.infer<typeof purchaseBody>>(res).plan);
  res.json(new ResponseClient({ message: "Đã mua vé, bạn có thể kích hoạt bất cứ lúc nào", data }));
});

planRouter.post("/tickets/:id/activate", authenticate, idempotent, limiter, validate(idParam, "params"), async (req: Request, res: Response) => {
  const data = await planService.activateTicket(req.user!.id, getValidated<z.infer<typeof idParam>>(res, "params").id);
  res.json(new ResponseClient({ message: data.renewed ? "Đã kích hoạt vé và cộng thêm thời hạn Pro" : "Đã kích hoạt gói Pro", data }));
});

export default planRouter;
