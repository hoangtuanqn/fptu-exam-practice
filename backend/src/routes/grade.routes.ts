import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate } from "../middlewares/auth.middlewares";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { getValidated, validate } from "../middlewares/validate.middlewares";
import { gradeSettingBody, gradeSyncBody, type GradeSettingBody, type GradeSyncBody } from "../rules/requests/grade.request";
import { ResponseClient } from "../rules/response";
import { gradeService } from "../services/grade.service";

// Điểm FAP của chính sinh viên (cá nhân hoá gợi ý ôn thi). Mọi thứ chỉ hoạt động khi sinh viên tự bật đồng bộ.
const gradeRouter = Router();
gradeRouter.use(authenticate, makeLimiter({ limit: 60 }));

gradeRouter.get("/me", async (req: Request, res: Response) => {
  res.json(new ResponseClient({ data: await gradeService.overview(req.user!.id) }));
});
gradeRouter.get("/setting", async (req: Request, res: Response) => {
  res.json(new ResponseClient({ data: await gradeService.setting(req.user!.id) }));
});
gradeRouter.put("/setting", validate(gradeSettingBody), async (req: Request, res: Response) => {
  const { enabled } = getValidated<GradeSettingBody>(res);
  res.json(new ResponseClient({ data: await gradeService.setEnabled(req.user!.id, enabled) }));
});
gradeRouter.post("/sync", validate(gradeSyncBody), async (req: Request, res: Response) => {
  res.json(new ResponseClient({ data: await gradeService.sync(req.user!.id, getValidated<GradeSyncBody>(res)) }));
});
gradeRouter.delete("/me", async (req: Request, res: Response) => {
  res.json(new ResponseClient({ data: await gradeService.clear(req.user!.id) }));
});

export default gradeRouter;
