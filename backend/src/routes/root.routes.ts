import { Router } from "express";
import adminRouter from "./admin.routes";
import attemptRouter from "./attempt.routes";
import authRouter from "./auth.routes";
import crawlJobRouter from "./crawl-job.routes";
import depositRouter from "./deposit.routes";
import examRouter from "./exam.routes";
import userRouter from "./user.routes";

const rootRouter = Router();

rootRouter.get("/health", (_req, res) => {
  res.json({ status: true, message: "OK", time: new Date().toISOString() });
});

rootRouter.use("/auth", authRouter);
rootRouter.use("/users", userRouter);
rootRouter.use("/deposits", depositRouter);
rootRouter.use("/crawl-jobs", crawlJobRouter);
rootRouter.use("/exams", examRouter);
rootRouter.use("/attempts", attemptRouter);
rootRouter.use("/admin", adminRouter);

export default rootRouter;
