import type { Request, Response } from "express";
import { HTTP_STATUS } from "../constants/httpStatus";
import { getValidated } from "../middlewares/validate.middlewares";
import type { IdParam } from "../rules/requests/admin.request";
import type { CreateGiftCodeBody, ListGiftCodesQuery, UpdateGiftCodeBody } from "../rules/requests/gift-code.request";
import { ResponseClient } from "../rules/response";
import { giftCodeService } from "../services/gift-code.service";
import type { PaginationQuery } from "../utils/pagination";

export const adminGiftCodeController = {
  async list(_req: Request, res: Response) {
    const { q, active, ...page } = getValidated<ListGiftCodesQuery>(res, "query");
    const { items, meta } = await giftCodeService.list(page, { q, active: active === undefined ? undefined : active === "true" });
    res.json(new ResponseClient({ data: items, meta }));
  },

  async create(_req: Request, res: Response) {
    const data = await giftCodeService.create(getValidated<CreateGiftCodeBody>(res));
    res.status(HTTP_STATUS.CREATED).json(new ResponseClient({ message: "Đã tạo giftcode", data }));
  },

  async setActive(_req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    const { active } = getValidated<UpdateGiftCodeBody>(res);
    res.json(new ResponseClient({ data: await giftCodeService.setActive(id, active) }));
  },

  async redemptions(_req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    const { items, meta } = await giftCodeService.redemptions(id, getValidated<PaginationQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },
};
