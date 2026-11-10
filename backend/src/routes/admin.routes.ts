import { Router } from "express";
import adminInsightsRouter from "./admin-insights.routes";
import { adminDashboardController } from "../controllers/admin.dashboard.controllers";
import { adminUserController } from "../controllers/admin.user.controllers";
import { listBankTxQuery, listDepositsQuery } from "../rules/requests/deposit.request";
import { adminSepayController } from "../controllers/admin.sepay.controllers";
import { adminDepositController } from "../controllers/admin.deposit.controllers";
import { adminSettingController } from "../controllers/admin.setting.controllers";
import { adminAiController } from "../controllers/admin.ai.controllers";
import { adminAnswerReportController } from "../controllers/admin.answer-report.controllers";
import { adminSubjectIssueController } from "../controllers/admin.subject-issue.controllers";
import { adminReferralController } from "../controllers/admin.referral.controllers";
import { adminGiftCodeController } from "../controllers/admin.gift-code.controllers";
import { adminCrawlerController } from "../controllers/admin.crawler.controllers";
import { adminHistoryController } from "../controllers/admin.history.controllers";
import { adminAccountController } from "../controllers/admin.account.controllers";
import { adminLinkRewardController } from "../controllers/admin.link-reward.controllers";
import { adminChatController } from "../controllers/admin.chat.controllers";
import { updateChatSettingsBody } from "../rules/requests/chat.request";
import { adminPromoController } from "../controllers/admin.promo.controllers";
import { listAttemptsQuery, listCrawlJobsQuery, listPurchasesQuery, listWalletQuery } from "../rules/requests/admin-history.request";
import { authenticate, requireAdmin } from "../middlewares/auth.middlewares";
import { updateAccountBody, updateAiBody, updateLinkRewardBody, updateCrawlerBody, updatePromoBody, updateReferralBody, updateSepayBody } from "../rules/requests/setting.request";
import { listReportsQuery, reviewReportBody } from "../rules/requests/answer-report.request";
import { createGiftCodeBody, listGiftCodesQuery, updateGiftCodeBody } from "../rules/requests/gift-code.request";
import { validate } from "../middlewares/validate.middlewares";
import { paginationQuery } from "../utils/pagination";
import { adjustBalanceBody, idParam, listUsersQuery, questionParam, renameExamBody, resetPasswordBody, updateExamQuestionsBody, updateUserBody } from "../rules/requests/admin.request";

const adminRouter = Router();

// Toàn bộ /admin/* chỉ dành cho ADMIN
adminRouter.use(authenticate, requireAdmin);

adminRouter.get("/dashboard", adminDashboardController.overview);
adminRouter.use("/insights", adminInsightsRouter);

adminRouter.get("/users",validate(listUsersQuery, "query"), adminUserController.list);
adminRouter.get("/users/:id", validate(idParam, "params"), adminUserController.get);
adminRouter.patch("/users/:id", validate(idParam, "params"), validate(updateUserBody), adminUserController.update);
adminRouter.post(
  "/users/:id/balance",
  validate(idParam, "params"),
  validate(adjustBalanceBody),
  adminUserController.adjustBalance,
);

adminRouter.get("/users/:id/summary", validate(idParam, "params"), adminUserController.summary);
adminRouter.post("/users/:id/reset-password", validate(idParam, "params"), validate(resetPasswordBody), adminUserController.resetPassword);
adminRouter.post("/users/:id/send-reset-link", validate(idParam, "params"), adminUserController.sendResetLink);
adminRouter.post("/users/:id/revoke-sessions", validate(idParam, "params"), adminUserController.revokeSessions);
adminRouter.post("/users/:id/impersonate", validate(idParam, "params"), adminUserController.impersonate);

adminRouter.get("/settings/chat", adminChatController.get);
adminRouter.put("/settings/chat", validate(updateChatSettingsBody), adminChatController.update);
adminRouter.post("/settings/chat/reindex", adminChatController.reindex);
adminRouter.delete("/settings/chat/cache", adminChatController.clearCache);

adminRouter.get("/settings/promo", adminPromoController.get);
adminRouter.put("/settings/promo", validate(updatePromoBody), adminPromoController.update);
adminRouter.get("/settings/account", adminAccountController.get);
adminRouter.put("/settings/account", validate(updateAccountBody), adminAccountController.update);
adminRouter.get("/settings/link-reward", adminLinkRewardController.get);
adminRouter.put("/settings/link-reward", validate(updateLinkRewardBody), adminLinkRewardController.update);

// Lịch sử: biến động số dư, lấy đề, bài làm (lọc được theo userId)
adminRouter.get("/wallet-transactions", validate(listWalletQuery, "query"), adminHistoryController.wallet);
adminRouter.get("/crawl-jobs", validate(listCrawlJobsQuery, "query"), adminHistoryController.crawlJobs);
adminRouter.get("/attempts", validate(listAttemptsQuery, "query"), adminHistoryController.attempts);
adminRouter.get("/pe-downloads", validate(listPurchasesQuery, "query"), adminHistoryController.peDownloads);
adminRouter.get("/explanation-unlocks", validate(listPurchasesQuery, "query"), adminHistoryController.explanationUnlocks);
adminRouter.get("/explanation-purchases", validate(listPurchasesQuery, "query"), adminHistoryController.explanationPurchases);

adminRouter.get("/deposits", validate(listDepositsQuery, "query"), adminDepositController.list);

adminRouter.get("/sepay/status", adminSepayController.status);
adminRouter.post("/sepay/sync", adminSepayController.syncNow);
adminRouter.get("/bank-transactions", validate(listBankTxQuery, "query"), adminSepayController.bankTransactions);

adminRouter.get("/settings/sepay", adminSettingController.getSepay);
adminRouter.put("/settings/sepay", validate(updateSepayBody), adminSettingController.updateSepay);

adminRouter.get("/settings/crawler", adminCrawlerController.get);
adminRouter.put("/settings/crawler", validate(updateCrawlerBody), adminCrawlerController.update);
adminRouter.post("/settings/crawler/login", adminCrawlerController.login);

adminRouter.get("/settings/ai", adminAiController.getSettings);
adminRouter.put("/settings/ai", validate(updateAiBody), adminAiController.updateSettings);

adminRouter.get("/exams", validate(paginationQuery, "query"), adminAiController.listExams);
adminRouter.get("/exams/:id", validate(idParam, "params"), adminAiController.examDetail);
adminRouter.patch("/exams/:id", validate(idParam, "params"), validate(renameExamBody), adminAiController.renameExam);
adminRouter.delete("/exams/:id", validate(idParam, "params"), adminAiController.removeExam);
adminRouter.patch("/exams/:id/questions", validate(idParam, "params"), validate(updateExamQuestionsBody), adminAiController.saveQuestions);
adminRouter.post("/exams/:id/questions/:number/resolve", validate(questionParam, "params"), adminAiController.resolveQuestion);
adminRouter.post("/exams/:id/solve", validate(idParam, "params"), adminAiController.solve);
adminRouter.get("/exams/:id/report", validate(idParam, "params"), adminAiController.report);

adminRouter.get("/gift-codes", validate(listGiftCodesQuery, "query"), adminGiftCodeController.list);
adminRouter.post("/gift-codes", validate(createGiftCodeBody), adminGiftCodeController.create);
adminRouter.patch("/gift-codes/:id", validate(idParam, "params"), validate(updateGiftCodeBody), adminGiftCodeController.setActive);
adminRouter.get("/gift-codes/:id/redemptions", validate(idParam, "params"), validate(paginationQuery, "query"), adminGiftCodeController.redemptions);

adminRouter.get("/answer-reports", validate(listReportsQuery, "query"), adminAnswerReportController.list);
adminRouter.post("/answer-reports/:id/approve", validate(idParam, "params"), validate(reviewReportBody), adminAnswerReportController.approve);
adminRouter.post("/answer-reports/:id/reject", validate(idParam, "params"), validate(reviewReportBody), adminAnswerReportController.reject);

adminRouter.get("/subject-issues", adminSubjectIssueController.list);
adminRouter.delete("/subject-issues/:id", validate(idParam, "params"), adminSubjectIssueController.resolve);

adminRouter.get("/settings/referral", adminReferralController.getSettings);
adminRouter.put("/settings/referral", validate(updateReferralBody), adminReferralController.updateSettings);
adminRouter.get("/referrals/summary", adminReferralController.summary);
adminRouter.get("/referrals", validate(paginationQuery, "query"), adminReferralController.list);

export default adminRouter;
