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
import { adminExplanationFeedbackController } from "../controllers/admin.explanation-feedback.controllers";
import { adminReferralController } from "../controllers/admin.referral.controllers";
import { adminGiftCodeController } from "../controllers/admin.gift-code.controllers";
import { adminCrawlerController } from "../controllers/admin.crawler.controllers";
import { adminFuoSourceController } from "../controllers/admin.fuo-source.controllers";
import { addFuoSourcesBody, listFuoSourcesQuery } from "../rules/requests/fuo-source.request";
import { adminHistoryController } from "../controllers/admin.history.controllers";
import { adminAccountController } from "../controllers/admin.account.controllers";
import { adminMarketingController } from "../controllers/admin.marketing.controllers";
import {
  campaignKeyParam,
  createBroadcastBody,
  listBroadcastsQuery,
  listLogsQuery,
  previewQuery,
  setCampaignBody,
  setParamsBody,
  setPausedBody,
  startBroadcastBody,
} from "../rules/requests/marketing.request";
import { adminLinkRewardController } from "../controllers/admin.link-reward.controllers";
import { adminChatController } from "../controllers/admin.chat.controllers";
import { updateChatSettingsBody } from "../rules/requests/chat.request";
import { adminPromoController } from "../controllers/admin.promo.controllers";
import { adminLibraryController } from "../controllers/admin.library.controllers";
import { adminNoticeController } from "../controllers/admin.notice.controllers";
import { listNoticesQuery, readAllNoticesBody, setNoticeReadBody } from "../rules/requests/admin-notice.request";
import { adminSubjectController } from "../controllers/admin.subject.controllers";
import { subjectCodeOnlyParam, subjectSemesterBody, updateSubjectBody } from "../rules/requests/library.request";
import { listAttemptsQuery, listCrawlJobsQuery, listPurchasesQuery, listWalletQuery } from "../rules/requests/admin-history.request";
import { authenticate, requireAdmin } from "../middlewares/auth.middlewares";
import { updateAccountBody, updateAiBody, updateLinkRewardBody, updateCrawlerBody, updatePromoBody, updateReferralBody, updateSepayBody } from "../rules/requests/setting.request";
import { listFeedbackQuery } from "../rules/requests/explanation.request";
import { listReportsQuery, reviewReportBody } from "../rules/requests/answer-report.request";
import { createGiftCodeBody, listGiftCodesQuery, updateGiftCodeBody } from "../rules/requests/gift-code.request";
import { validate } from "../middlewares/validate.middlewares";
import { paginationQuery } from "../utils/pagination";
import { adjustBalanceBody, uuidParam, listUsersQuery, questionParam, renameExamBody, resetPasswordBody, updateExamQuestionsBody, updateUserBody } from "../rules/requests/admin.request";

const adminRouter = Router();

// Toàn bộ /admin/* chỉ dành cho ADMIN
adminRouter.use(authenticate, requireAdmin);

adminRouter.get("/dashboard", adminDashboardController.overview);
adminRouter.use("/insights", adminInsightsRouter);

adminRouter.get("/users",validate(listUsersQuery, "query"), adminUserController.list);
adminRouter.get("/users/:id", validate(uuidParam, "params"), adminUserController.get);
adminRouter.patch("/users/:id", validate(uuidParam, "params"), validate(updateUserBody), adminUserController.update);
adminRouter.post(
  "/users/:id/balance",
  validate(uuidParam, "params"),
  validate(adjustBalanceBody),
  adminUserController.adjustBalance,
);

adminRouter.get("/users/:id/summary", validate(uuidParam, "params"), adminUserController.summary);
adminRouter.post("/users/:id/reset-password", validate(uuidParam, "params"), validate(resetPasswordBody), adminUserController.resetPassword);
adminRouter.post("/users/:id/send-reset-link", validate(uuidParam, "params"), adminUserController.sendResetLink);
adminRouter.post("/users/:id/revoke-sessions", validate(uuidParam, "params"), adminUserController.revokeSessions);
adminRouter.post("/users/:id/impersonate", validate(uuidParam, "params"), adminUserController.impersonate);

adminRouter.get("/settings/chat", adminChatController.get);
adminRouter.put("/settings/chat", validate(updateChatSettingsBody), adminChatController.update);
adminRouter.post("/settings/chat/reindex", adminChatController.reindex);
adminRouter.delete("/settings/chat/cache", adminChatController.clearCache);

adminRouter.get("/settings/promo", adminPromoController.get);
adminRouter.put("/settings/promo", validate(updatePromoBody), adminPromoController.update);
adminRouter.get("/notices", validate(listNoticesQuery, "query"), adminNoticeController.list);
adminRouter.get("/notices/counts", adminNoticeController.counts);
adminRouter.post("/notices/read-all", validate(readAllNoticesBody), adminNoticeController.readAll);
adminRouter.delete("/notices/read", adminNoticeController.deleteRead);
adminRouter.patch("/notices/:id", validate(uuidParam, "params"), validate(setNoticeReadBody), adminNoticeController.setRead);
adminRouter.get("/subjects", adminSubjectController.list);
adminRouter.get("/subjects/:code", validate(subjectCodeOnlyParam, "params"), adminSubjectController.detail);
adminRouter.patch("/subjects/:code", validate(subjectCodeOnlyParam, "params"), validate(updateSubjectBody), adminSubjectController.update);
adminRouter.delete("/subjects/:code/inferred-chapters", validate(subjectCodeOnlyParam, "params"), adminSubjectController.clearInferred);
adminRouter.get("/library/subjects", adminLibraryController.board);
adminRouter.put("/library/subjects/:code/semester", validate(subjectCodeOnlyParam, "params"), validate(subjectSemesterBody), adminLibraryController.setSemester);
adminRouter.get("/marketing/campaigns", adminMarketingController.campaigns);
adminRouter.patch("/marketing/campaigns/:key", validate(campaignKeyParam, "params"), validate(setCampaignBody), adminMarketingController.setEnabled);
adminRouter.post("/marketing/campaigns/:key/test", validate(campaignKeyParam, "params"), adminMarketingController.sendTest);
adminRouter.get("/marketing/eligible-count", adminMarketingController.eligibleCount);
adminRouter.get("/marketing/overview", adminMarketingController.overview);
adminRouter.put("/marketing/paused", validate(setPausedBody), adminMarketingController.setPaused);
adminRouter.get("/marketing/params", adminMarketingController.params);
adminRouter.put("/marketing/params", validate(setParamsBody), adminMarketingController.setParams);
adminRouter.post("/marketing/params/reset", adminMarketingController.resetParams);
adminRouter.get("/marketing/campaigns/:key/preview", validate(campaignKeyParam, "params"), validate(previewQuery, "query"), adminMarketingController.preview);
adminRouter.get("/marketing/logs", validate(listLogsQuery, "query"), adminMarketingController.logs);
adminRouter.post("/marketing/broadcasts", validate(createBroadcastBody), adminMarketingController.createBroadcast);
adminRouter.get("/marketing/broadcasts", validate(listBroadcastsQuery, "query"), adminMarketingController.broadcasts);
adminRouter.get("/marketing/broadcasts/:id/estimate", validate(uuidParam, "params"), adminMarketingController.estimateBroadcast);
adminRouter.get("/marketing/broadcasts/:id/preview", validate(uuidParam, "params"), adminMarketingController.previewBroadcast);
adminRouter.post("/marketing/broadcasts/:id/test", validate(uuidParam, "params"), adminMarketingController.testBroadcast);
adminRouter.post("/marketing/broadcasts/:id/start", validate(uuidParam, "params"), validate(startBroadcastBody), adminMarketingController.startBroadcast);
adminRouter.post("/marketing/broadcasts/:id/cancel", validate(uuidParam, "params"), adminMarketingController.cancelBroadcast);
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

// Danh sách link đề FuOverflow và lượt nạp dữ liệu mới (chạy nền)
adminRouter.get("/fuo-sources", validate(listFuoSourcesQuery, "query"), adminFuoSourceController.list);
adminRouter.post("/fuo-sources", validate(addFuoSourcesBody), adminFuoSourceController.add);
adminRouter.get("/fuo-sources/status", adminFuoSourceController.status);
adminRouter.post("/fuo-sources/runs", adminFuoSourceController.start);

adminRouter.get("/settings/ai", adminAiController.getSettings);
adminRouter.put("/settings/ai", validate(updateAiBody), adminAiController.updateSettings);

adminRouter.get("/exams", validate(paginationQuery, "query"), adminAiController.listExams);
adminRouter.get("/exams/:id", validate(uuidParam, "params"), adminAiController.examDetail);
adminRouter.patch("/exams/:id", validate(uuidParam, "params"), validate(renameExamBody), adminAiController.renameExam);
adminRouter.delete("/exams/:id", validate(uuidParam, "params"), adminAiController.removeExam);
adminRouter.patch("/exams/:id/questions", validate(uuidParam, "params"), validate(updateExamQuestionsBody), adminAiController.saveQuestions);
adminRouter.post("/exams/:id/questions/:number/resolve", validate(questionParam, "params"), adminAiController.resolveQuestion);
adminRouter.post("/exams/:id/solve", validate(uuidParam, "params"), adminAiController.solve);
adminRouter.get("/exams/:id/report", validate(uuidParam, "params"), adminAiController.report);
adminRouter.get("/exams/:id/download", validate(uuidParam, "params"), adminAiController.downloadExam);

adminRouter.get("/gift-codes", validate(listGiftCodesQuery, "query"), adminGiftCodeController.list);
adminRouter.post("/gift-codes", validate(createGiftCodeBody), adminGiftCodeController.create);
adminRouter.patch("/gift-codes/:id", validate(uuidParam, "params"), validate(updateGiftCodeBody), adminGiftCodeController.setActive);
adminRouter.get("/gift-codes/:id/redemptions", validate(uuidParam, "params"), validate(paginationQuery, "query"), adminGiftCodeController.redemptions);

adminRouter.get("/explanation-feedback", validate(listFeedbackQuery, "query"), adminExplanationFeedbackController.list);
adminRouter.get("/explanation-feedback/summary", adminExplanationFeedbackController.summary);
adminRouter.post("/explanation-feedback/:id/resolve", validate(uuidParam, "params"), adminExplanationFeedbackController.resolve);
adminRouter.get("/review-counts", adminAnswerReportController.reviewCounts);
adminRouter.get("/answer-reports", validate(listReportsQuery, "query"), adminAnswerReportController.list);
adminRouter.post("/answer-reports/:id/approve", validate(uuidParam, "params"), validate(reviewReportBody), adminAnswerReportController.approve);
adminRouter.post("/answer-reports/:id/reject", validate(uuidParam, "params"), validate(reviewReportBody), adminAnswerReportController.reject);
adminRouter.post("/answer-reports/:id/resolve", validate(uuidParam, "params"), adminAnswerReportController.resolve);


adminRouter.get("/settings/referral", adminReferralController.getSettings);
adminRouter.put("/settings/referral", validate(updateReferralBody), adminReferralController.updateSettings);
adminRouter.get("/referrals/summary", adminReferralController.summary);
adminRouter.get("/referrals", validate(paginationQuery, "query"), adminReferralController.list);

export default adminRouter;
