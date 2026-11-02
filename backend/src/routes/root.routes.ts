import { Router } from "express";
import authRouter from "./auth.routes";

const rootRouter = Router();

rootRouter.get("/health", (_req, res) => {
  res.json({ status: true, message: "OK", time: new Date().toISOString() });
});

rootRouter.use("/auth", authRouter);

export default rootRouter;
