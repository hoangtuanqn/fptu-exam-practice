import { Router } from "express";
import { adminDashboardController } from "../controllers/admin.dashboard.controllers";
import { adminUserController } from "../controllers/admin.user.controllers";
import { listBankTxQuery, listDepositsQuery } from "../rules/requests/deposit.request";
import { adminSepayController } from "../controllers/admin.sepay.controllers";
import { adminDepositController } from "../controllers/admin.deposit.controllers";
import { adminSettingController } from "../controllers/admin.setting.controllers";
import { adminCrawlerController } from "../controllers/admin.crawler.controllers";
import { authenticate, requireAdmin } from "../middlewares/auth.middlewares";
import { updateCrawlerBody, updateSepayBody } from "../rules/requests/setting.request";
import { validate } from "../middlewares/validate.middlewares";
import { adjustBalanceBody, idParam, listUsersQuery, updateUserBody } from "../rules/requests/admin.request";

const adminRouter = Router();

// Toàn bộ /admin/* chỉ dành cho ADMIN
adminRouter.use(authenticate, requireAdmin);

adminRouter.get("/dashboard", adminDashboardController.overview);

adminRouter.get("/users",validate(listUsersQuery, "query"), adminUserController.list);
adminRouter.get("/users/:id", validate(idParam, "params"), adminUserController.get);
adminRouter.patch("/users/:id", validate(idParam, "params"), validate(updateUserBody), adminUserController.update);
adminRouter.post(
  "/users/:id/balance",
  validate(idParam, "params"),
  validate(adjustBalanceBody),
  adminUserController.adjustBalance,
);

adminRouter.get("/deposits", validate(listDepositsQuery, "query"), adminDepositController.list);

adminRouter.get("/sepay/status", adminSepayController.status);
adminRouter.post("/sepay/sync", adminSepayController.syncNow);
adminRouter.get("/bank-transactions", validate(listBankTxQuery, "query"), adminSepayController.bankTransactions);

adminRouter.get("/settings/sepay", adminSettingController.getSepay);
adminRouter.put("/settings/sepay", validate(updateSepayBody), adminSettingController.updateSepay);

adminRouter.get("/settings/crawler", adminCrawlerController.get);
adminRouter.put("/settings/crawler", validate(updateCrawlerBody), adminCrawlerController.update);

export default adminRouter;
