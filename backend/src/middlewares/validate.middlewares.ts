import type { RequestHandler, Response } from "express";
import type { ZodType } from "zod";

type Source = "body" | "query" | "params";

// Validate bằng zod rồi cất kết quả đã ép kiểu vào res.locals (req.query của Express 5 là read-only)
export const validate =
  (schema: ZodType, source: Source = "body"): RequestHandler =>
  (req, res, next) => {
    res.locals[source] = schema.parse(req[source]);
    next();
  };

export const getValidated = <T>(res: Response, source: Source = "body") => res.locals[source] as T;
