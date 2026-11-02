import { Router } from "express";
import { adminUserController } from "../controllers/admin.user.controllers";
import { listDepositsQuery } from "../rules/requests/deposit.request";
import { adminDepositController } from "../controllers/admin.deposit.controllers";
import { adminSettingController } from "../controllers/admin.setting.controllers";
import { authenticate, requireAdmin } from "../middlewares/auth.middlewares";
import { updateSepayBody } from "../rules/requests/setting.request";
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

adminRouter.get("/deposits", validate(listDepositsQuery, "query"), adminDepositController.list);

adminRouter.get("/settings/sepay", adminSettingController.getSepay);
adminRouter.put("/settings/sepay", validate(updateSepayBody), adminSettingController.updateSepay);

export default adminRouter;
