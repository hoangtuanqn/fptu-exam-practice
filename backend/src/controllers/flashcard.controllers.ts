import type { Request, Response } from "express";
import { env, storageDir } from "../configs/env";
import { getValidated } from "../middlewares/validate.middlewares";
import { AppError } from "../rules/error";
import type { FlashcardImageParam } from "../rules/requests/flashcard.request";
import type { SubjectCodeParam } from "../rules/requests/subject.request";
import { ResponseClient } from "../rules/response";
import { flashcardService } from "../services/flashcard.service";
import { isValidExamFileSignature } from "../utils/exam-path";
import { resolveInside } from "../utils/exam-zip";
import { flashcardRel } from "../utils/flashcard";

export const flashcardController = {
  async subjects(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await flashcardService.listSubjects() }));
  },

  async subject(req: Request, res: Response) {
    const { code } = getValidated<SubjectCodeParam>(res, "params");
    res.json(new ResponseClient({ data: await flashcardService.forSubject(code, req.user) }));
  },

  /** Ảnh thẻ: chỉ phát khi link còn hạn và chữ ký đúng cho đúng ảnh này (link do máy chủ cấp, chỉ cho thẻ người xem được xem). */
  async image(req: Request, res: Response) {
    const { code, file } = getValidated<FlashcardImageParam>(res, "params");
    const rel = flashcardRel(code, Number(file.slice(1, -5)));
    if (!isValidExamFileSignature(rel, req.query.e, req.query.s, env.JWT_SECRET)) throw AppError.notFound("Không tìm thấy tệp");
    const abs = resolveInside(storageDir, rel);
    if (!abs) throw AppError.notFound("Không tìm thấy tệp");
    res.set({ "Cache-Control": "private, max-age=3600", "Cross-Origin-Resource-Policy": "cross-origin", "X-Content-Type-Options": "nosniff" });
    await new Promise<void>((resolve, reject) => res.sendFile(abs, { dotfiles: "deny" }, (err) => (err && !res.headersSent ? reject(AppError.notFound("Không tìm thấy tệp")) : resolve())));
  },
};
