import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { PeDownloadBody } from "../rules/requests/pe.request";
import { ResponseClient } from "../rules/response";
import { peService } from "../services/pe.service";

export const peController = {
  price(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: peService.price() }));
  },

  async quote(req: Request, res: Response) {
    res.json(new ResponseClient({ data: await peService.quote(req.user!.id, String(req.query.url ?? "")) }));
  },

  async history(req: Request, res: Response) {
    res.json(new ResponseClient({ data: await peService.history(req.user!.id) }));
  },

  async download(req: Request, res: Response) {
    const { url } = getValidated<PeDownloadBody>(res);
    const { file, filename } = await peService.download(req.user!.id, url);
    res.download(file, filename);
  },
};
