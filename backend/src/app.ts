import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env, storageDir } from "./configs/env";
import { errorHandler, notFoundHandler } from "./middlewares/error.middlewares";
import rootRouter from "./routes/root.routes";

// Tách app khỏi việc listen để dễ test
export const createApp = () => {
  const app = express();

  if (env.TRUST_PROXY > 0) app.set("trust proxy", env.TRUST_PROXY); // sau Nginx: req.ip là IP thật của người dùng

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(express.json({ limit: "100kb" }));

  // Ảnh đề đã crawl. Cho phép trang web ở origin khác nhúng (helmet mặc định chỉ cho cùng origin)
  app.use(
    "/api/v1/files",
    (_req, res, next) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      next();
    },
    express.static(storageDir, { maxAge: "7d", immutable: true, index: false, dotfiles: "ignore" }),
  );

  app.use("/api/v1", rootRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};
