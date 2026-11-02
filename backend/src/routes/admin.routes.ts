import { Router } from "express";
import { adminUserController } from "../controllers/admin.user.controllers";
import { authenticate, requireAdmin } from "../middlewares/auth.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { adjustBalanceBody, idParam, listUsersQuery, updateUserBody } from "../rules/requests/admin.request";

const adminRouter = Router();

// Toàn bộ /admin/* chỉ dành cho ADMIN
adminRouter.use(authenticate, requireAdmin);

adminRouter.get("/users", validate(listUsersQuery, "query"), adminUserController.list);
adminRouter.get("/users/:id", validate(idParam, "params"), adminUserController.get);
adminRouter.patch("/users/:id", validate(idParam, "params"), validate(updateUserBody), adminUserController.update);
adminRouter.post(
  "/users/:id/balance",
  validate(idParam, "params"),
  validate(adjustBalanceBody),
  adminUserController.adjustBalance,
);

export default adminRouter;
