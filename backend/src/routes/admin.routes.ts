import { Router } from "express";
import { adminDashboardController } from "../controllers/admin.dashboard.controllers";
import { adminUserController } from "../controllers/admin.user.controllers";
import { listBankTxQuery, listDepositsQuery } from "../rules/requests/deposit.request";
import { adminSepayController } from "../controllers/admin.sepay.controllers";
import { adminDepositController } from "../controllers/admin.deposit.controllers";
import { adminSettingController } from "../controllers/admin.setting.controllers";
import { adminAiController } from "../controllers/admin.ai.controllers";
import { adminAnswerReportController } from "../controllers/admin.answer-report.controllers";
import { adminReferralController } from "../controllers/admin.referral.controllers";
import { adminGiftCodeController } from "../controllers/admin.gift-code.controllers";
import { adminCrawlerController } from "../controllers/admin.crawler.controllers";
import { adminHistoryController } from "../controllers/admin.history.controllers";
import { adminAccountController } from "../controllers/admin.account.controllers";
import { listAttemptsQuery, listCrawlJobsQuery, listWalletQuery } from "../rules/requests/admin-history.request";
import { authenticate, requireAdmin } from "../middlewares/auth.middlewares";
import { updateAccountBody, updateAiBody, updateCrawlerBody, updateReferralBody, updateSepayBody } from "../rules/requests/setting.request";
import { listReportsQuery, reviewReportBody } from "../rules/requests/answer-report.request";
import { createGiftCodeBody, listGiftCodesQuery, updateGiftCodeBody } from "../rules/requests/gift-code.request";
import { validate } from "../middlewares/validate.middlewares";
import { paginationQuery } from "../utils/pagination";
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

adminRouter.get("/settings/account", adminAccountController.get);
adminRouter.put("/settings/account", validate(updateAccountBody), adminAccountController.update);

// Lịch sử: biến động số dư, lấy đề, bài làm (lọc được theo userId)
adminRouter.get("/wallet-transactions", validate(listWalletQuery, "query"), adminHistoryController.wallet);
adminRouter.get("/crawl-jobs", validate(listCrawlJobsQuery, "query"), adminHistoryController.crawlJobs);
adminRouter.get("/attempts", validate(listAttemptsQuery, "query"), adminHistoryController.attempts);

adminRouter.get("/deposits", validate(listDepositsQuery, "query"), adminDepositController.list);

adminRouter.get("/sepay/status", adminSepayController.status);
adminRouter.post("/sepay/sync", adminSepayController.syncNow);
adminRouter.get("/bank-transactions", validate(listBankTxQuery, "query"), adminSepayController.bankTransactions);

adminRouter.get("/settings/sepay", adminSettingController.getSepay);
adminRouter.put("/settings/sepay", validate(updateSepayBody), adminSettingController.updateSepay);

adminRouter.get("/settings/crawler", adminCrawlerController.get);
adminRouter.put("/settings/crawler", validate(updateCrawlerBody), adminCrawlerController.update);

adminRouter.get("/settings/ai", adminAiController.getSettings);
adminRouter.put("/settings/ai", validate(updateAiBody), adminAiController.updateSettings);

adminRouter.get("/exams", validate(paginationQuery, "query"), adminAiController.listExams);
adminRouter.post("/exams/:id/solve", validate(idParam, "params"), adminAiController.solve);
adminRouter.get("/exams/:id/report", validate(idParam, "params"), adminAiController.report);

adminRouter.get("/gift-codes", validate(listGiftCodesQuery, "query"), adminGiftCodeController.list);
adminRouter.post("/gift-codes", validate(createGiftCodeBody), adminGiftCodeController.create);
adminRouter.patch("/gift-codes/:id", validate(idParam, "params"), validate(updateGiftCodeBody), adminGiftCodeController.setActive);
adminRouter.get("/gift-codes/:id/redemptions", validate(idParam, "params"), validate(paginationQuery, "query"), adminGiftCodeController.redemptions);

adminRouter.get("/answer-reports", validate(listReportsQuery, "query"), adminAnswerReportController.list);
adminRouter.post("/answer-reports/:id/approve", validate(idParam, "params"), validate(reviewReportBody), adminAnswerReportController.approve);
adminRouter.post("/answer-reports/:id/reject", validate(idParam, "params"), validate(reviewReportBody), adminAnswerReportController.reject);

adminRouter.get("/settings/referral", adminReferralController.getSettings);
adminRouter.put("/settings/referral", validate(updateReferralBody), adminReferralController.updateSettings);
adminRouter.get("/referrals/summary", adminReferralController.summary);
adminRouter.get("/referrals", validate(paginationQuery, "query"), adminReferralController.list);

export default adminRouter;
