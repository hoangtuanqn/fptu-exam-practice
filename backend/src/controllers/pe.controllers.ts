import type { Request, Response } from "express";
import { ResponseClient } from "../rules/response";
import { peService } from "../services/pe.service";

export const peController = {
  price(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: peService.price() }));
  },

  async history(req: Request, res: Response) {
    res.json(new ResponseClient({ data: await peService.history(req.user!.id) }));
  },
};
