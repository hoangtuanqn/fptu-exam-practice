import { Router } from "express";
import adminRouter from "./admin.routes";
import authRouter from "./auth.routes";
import userRouter from "./user.routes";

const rootRouter = Router();

rootRouter.get("/health", (_req, res) => {
  res.json({ status: true, message: "OK", time: new Date().toISOString() });
});

rootRouter.use("/auth", authRouter);
rootRouter.use("/users", userRouter);
rootRouter.use("/admin", adminRouter);

export default rootRouter;
