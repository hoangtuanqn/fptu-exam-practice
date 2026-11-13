import { Router } from "express";
import adminRouter from "./admin.routes";
import answerReportRouter from "./answer-report.routes";
import attemptRouter from "./attempt.routes";
import catalogRouter from "./catalog.routes";
import checkInRouter from "./check-in.routes";
import planRouter from "./plan.routes";
import promptEventRouter from "./prompt-event.routes";
import linkRewardRouter from "./link-reward.routes";
import reviewRouter, { studyRouter } from "./review.routes";
import fsrsReviewRouter from "./fsrs-review.routes";
import sessionRouter from "./session.routes";
import authRouter from "./auth.routes";
import chatRouter from "./chat.routes";
import crawlJobRouter from "./crawl-job.routes";
import depositPublicRouter from "./deposit-public.routes";
import depositRouter from "./deposit.routes";
import examRouter from "./exam.routes";
import explanationRouter from "./explanation.routes";
import giftCodeRouter from "./gift-code.routes";
import offersPublicRouter from "./offers-public.routes";
import extensionRouter from "./extension.routes";
import peRouter from "./pe.routes";
import { referralPublicRouter, referralRouter } from "./referral.routes";
import reminderPublicRouter from "./reminder-public.routes";
import gradeRouter from "./grade.routes";
import materialRouter from "./material.routes";
import marketingRouter from "./marketing.routes";
import subjectRouter from "./subject.routes";
import userRouter from "./user.routes";

const rootRouter = Router();

rootRouter.get("/health", (_req, res) => {
  res.json({ status: true, message: "OK", time: new Date().toISOString() });
});

rootRouter.use("/auth", authRouter);
rootRouter.use("/users", userRouter);
rootRouter.use("/deposits", depositRouter);
rootRouter.use("/public/deposits", depositPublicRouter);
rootRouter.use("/crawl-jobs", crawlJobRouter);
rootRouter.use("/exams", examRouter);
rootRouter.use("/gift-codes", giftCodeRouter);
rootRouter.use("/check-in", checkInRouter);
rootRouter.use("/events", promptEventRouter);
rootRouter.use("/plan", planRouter);
rootRouter.use("/link-rewards", linkRewardRouter);
rootRouter.use("/explanations", explanationRouter);
rootRouter.use("/referrals", referralRouter);
rootRouter.use("/public/referrals", referralPublicRouter);
rootRouter.use("/public/offers", offersPublicRouter);
rootRouter.use("/pe", peRouter);
rootRouter.use("/extension", extensionRouter);
rootRouter.use("/chat", chatRouter);
rootRouter.use("/catalog", catalogRouter);
rootRouter.use("/public/reminder", reminderPublicRouter);
rootRouter.use("/marketing", marketingRouter); // hủy nhận thư marketing (công khai)
rootRouter.use("/subjects", subjectRouter);
rootRouter.use("/grades", gradeRouter);
rootRouter.use("/materials", materialRouter); // phân tích slide (Pro)
rootRouter.use("/attempts", attemptRouter);
rootRouter.use("/review", reviewRouter);
rootRouter.use("/reviews", fsrsReviewRouter); // lịch ôn FSRS (khác /review là Sổ câu sai Leitner)
rootRouter.use("/study", studyRouter);
rootRouter.use("/sessions", sessionRouter);
rootRouter.use("/answer-reports", answerReportRouter);
rootRouter.use("/admin", adminRouter);

export default rootRouter;
