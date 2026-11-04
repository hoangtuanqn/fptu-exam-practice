import { Router } from "express";
import { practiceSessionController } from "../controllers/practice-session.controllers";
import { identify } from "../middlewares/auth.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { idParam } from "../rules/requests/admin.request";
import { listSessionsQuery, saveSessionBody } from "../rules/requests/session.request";

// Lượt làm bài dở dang: khách cũng dùng được (theo X-Guest-Id), nhận về tài khoản khi đăng ký/đăng nhập
const sessionRouter = Router();

sessionRouter.use(identify);

sessionRouter.get("/", validate(listSessionsQuery, "query"), practiceSessionController.list);
sessionRouter.get("/:id", validate(idParam, "params"), practiceSessionController.get);
sessionRouter.put("/:id", validate(idParam, "params"), validate(saveSessionBody), practiceSessionController.save);
sessionRouter.delete("/:id", validate(idParam, "params"), practiceSessionController.remove);

export default sessionRouter;
