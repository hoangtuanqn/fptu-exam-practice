import { Router } from "express";
import adminRouter from "./admin.routes";
import answerReportRouter from "./answer-report.routes";
import attemptRouter from "./attempt.routes";
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
import peRouter from "./pe.routes";
import { referralPublicRouter, referralRouter } from "./referral.routes";
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
rootRouter.use("/explanations", explanationRouter);
rootRouter.use("/referrals", referralRouter);
rootRouter.use("/public/referrals", referralPublicRouter);
rootRouter.use("/public/offers", offersPublicRouter);
rootRouter.use("/pe", peRouter);
rootRouter.use("/chat", chatRouter);
rootRouter.use("/attempts", attemptRouter);
rootRouter.use("/sessions", sessionRouter);
rootRouter.use("/answer-reports", answerReportRouter);
rootRouter.use("/admin", adminRouter);

export default rootRouter;
