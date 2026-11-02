import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./configs/env";
import { errorHandler, notFoundHandler } from "./middlewares/error.middlewares";
import rootRouter from "./routes/root.routes";

// Tách app khỏi việc listen để dễ test
export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(express.json({ limit: "100kb" }));

  app.use("/api/v1", rootRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};
