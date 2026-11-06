import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { UpdateChatSettingsBody } from "../rules/requests/chat.request";
import { ResponseClient } from "../rules/response";
import { chatCacheService } from "../services/chat-cache.service";
import { chatService } from "../services/chat.service";
import { chatSettingService } from "../services/chat-setting.service";
import { knowledgeService } from "../services/knowledge.service";

export const adminChatController = {
  async get(_req: Request, res: Response) {
    const [settings, knowledge, stats, cache] = await Promise.all([chatSettingService.getForAdmin(), knowledgeService.stats(), chatService.adminStats(), chatCacheService.stats()]);
    res.json(new ResponseClient({ data: { settings, knowledge, stats, cache } }));
  },

  async update(_req: Request, res: Response) {
    const data = await chatSettingService.update(getValidated<UpdateChatSettingsBody>(res));
    res.json(new ResponseClient({ message: "Đã lưu cấu hình chatbot", data }));
  },

  // Đọc lại tài liệu hướng dẫn và tạo embedding cho mục mới/đã sửa
  async reindex(_req: Request, res: Response) {
    const data = await knowledgeService.reindex();
    await chatCacheService.purgeStale().catch(() => undefined); // tài liệu đổi thì câu trả lời cũ không còn đúng
    res.json(new ResponseClient({ message: data.warning ?? `Đã cập nhật tri thức: ${data.updated} mục mới/đã đổi, ${data.embedded}/${data.total} mục có embedding`, data }));
  },

  async clearCache(_req: Request, res: Response) {
    const removed = await chatCacheService.clear();
    res.json(new ResponseClient({ message: `Đã xoá ${removed} câu trả lời đã lưu`, data: { removed } }));
  },
};
