import type { Request, Response } from "express";
import { HTTP_STATUS } from "../constants/httpStatus";
import { getValidated } from "../middlewares/validate.middlewares";
import type { AddFuoSourcesBody, FetchMissingBody, ListFuoSourcesQuery } from "../rules/requests/fuo-source.request";
import { ResponseClient } from "../rules/response";
import { fuoSourceService } from "../services/fuo-source.service";

export const adminFuoSourceController = {
  async add(_req: Request, res: Response) {
    const data = await fuoSourceService.add(getValidated<AddFuoSourcesBody>(res).text);
    res.json(new ResponseClient({ message: `Đã thêm ${data.added} link mới`, data }));
  },

  async list(_req: Request, res: Response) {
    const { status, ...page } = getValidated<ListFuoSourcesQuery>(res, "query");
    const { items, meta } = await fuoSourceService.list(page, status);
    res.json(new ResponseClient({ data: items, meta }));
  },

  async status(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await fuoSourceService.status() }));
  },

  // Trả về ngay (202), việc nạp chạy nền
  async start(req: Request, res: Response) {
    const data = await fuoSourceService.start(req.user!.id);
    res.status(HTTP_STATUS.ACCEPTED).json(new ResponseClient({ message: data.started ? "Đã bắt đầu nạp dữ liệu mới" : "Đang có lượt nạp dữ liệu chạy", data }));
  },

  // "Lấy hết đề còn thiếu": trả về ngay (202), lượt nạp chạy nền
  async fetchMissing(req: Request, res: Response) {
    const { threadIds, ...filter } = getValidated<FetchMissingBody>(res);
    const data = await fuoSourceService.fetchMissing(req.user!.id, filter, threadIds);
    const message = data.started ? `Đã bắt đầu lấy ${data.queued} đề còn thiếu` : data.queued ? `Đã thêm ${data.queued} đề vào lượt nạp đang chạy` : "Không có đề nào cần lấy thêm";
    res.status(HTTP_STATUS.ACCEPTED).json(new ResponseClient({ message, data }));
  },

  // Dừng lượt sau khi đề đang lấy xong
  async stop(_req: Request, res: Response) {
    const data = await fuoSourceService.stop();
    res.json(new ResponseClient({ message: data.stopping ? "Sẽ dừng sau khi đề đang lấy xong" : "Không có lượt nào đang chạy", data }));
  },
};
