import type { Request, Response } from "express";
import { HTTP_STATUS } from "../constants/httpStatus";
import { getValidated } from "../middlewares/validate.middlewares";
import type { IdParam } from "../rules/requests/admin.request";
import type { CreateSessionBody, ListSessionsQuery, SaveSessionBody } from "../rules/requests/session.request";
import { ResponseClient } from "../rules/response";
import { practiceSessionService } from "../services/practice-session.service";
import { actorOf } from "../utils/actor";

export const practiceSessionController = {
  async create(req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    const data = await practiceSessionService.create(actorOf(req), id, getValidated<CreateSessionBody>(res));
    res.status(HTTP_STATUS.CREATED).json(new ResponseClient({ data }));
  },

  async list(req: Request, res: Response) {
    const { items, meta } = await practiceSessionService.listMine(actorOf(req), getValidated<ListSessionsQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },

  async get(req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    res.json(new ResponseClient({ data: await practiceSessionService.get(actorOf(req), id) }));
  },

  async save(req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    res.json(new ResponseClient({ data: await practiceSessionService.save(actorOf(req), id, getValidated<SaveSessionBody>(res)) }));
  },

  async remove(req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    await practiceSessionService.remove(actorOf(req), id);
    res.json(new ResponseClient({ message: "Đã xoá lượt làm bài" }));
  },
};
