import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { PromptEventBody } from "../rules/requests/prompt-event.request";
import { ResponseClient } from "../rules/response";
import { promptEventService } from "../services/prompt-event.service";

export const promptEventController = {
  async record(req: Request, res: Response) {
    await promptEventService.record(req.user!.id, getValidated<PromptEventBody>(res));
    res.json(new ResponseClient({ data: { ok: true } }));
  },
};
