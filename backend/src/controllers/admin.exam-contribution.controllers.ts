import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import { AppError } from "../rules/error";
import type { UuidParam } from "../rules/requests/admin.request";
import type { ContributionImageParam, ListContributionsQuery, ReviewContributionBody } from "../rules/requests/exam-contribution.request";
import { ResponseClient } from "../rules/response";
import { examContributionService } from "../services/exam-contribution.service";

export const adminExamContributionController = {
  async list(_req: Request, res: Response) {
    const { items, meta } = await examContributionService.list(getValidated<ListContributionsQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },

  // Ảnh chỉ phát qua đây (đã chặn ở /api/v1/files): admin tải bằng fetch có token rồi hiện bằng blob
  async image(_req: Request, res: Response) {
    const { id, index } = getValidated<ContributionImageParam>(res, "params");
    const abs = await examContributionService.imagePath(id, index);
    res.set({ "Cache-Control": "private, max-age=3600", "Cross-Origin-Resource-Policy": "cross-origin", "X-Content-Type-Options": "nosniff" });
    await new Promise<void>((resolve, reject) =>
      res.sendFile(abs, { dotfiles: "deny" }, (err) => (err && !res.headersSent ? reject(AppError.notFound("Không tìm thấy ảnh")) : resolve())),
    );
  },

  async approve(req: Request, res: Response) {
    const { id } = getValidated<UuidParam>(res, "params");
    res.json(new ResponseClient({ message: "Đã duyệt đóng góp", data: await examContributionService.approve(req.user!.id, id, getValidated<ReviewContributionBody>(res)) }));
  },

  async reject(req: Request, res: Response) {
    const { id } = getValidated<UuidParam>(res, "params");
    res.json(new ResponseClient({ message: "Đã từ chối đóng góp và xoá ảnh", data: await examContributionService.reject(req.user!.id, id, getValidated<ReviewContributionBody>(res)) }));
  },
};
