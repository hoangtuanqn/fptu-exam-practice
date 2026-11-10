import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { ChatBody } from "../rules/requests/chat.request";
import { ResponseClient } from "../rules/response";
import { actorOf } from "../utils/actor";
import { AppError } from "../rules/error";
import { chatService } from "../services/chat.service";

export const chatController = {
  // Công khai: giao diện hỏi trước xem chatbot có đang bật không
  async config(_req: Request, res: Response) {
    const status = await chatService.status();
    res.json(new ResponseClient({ data: { enabled: status.enabled } }));
  },

  // Trả lời dạng stream (Server-Sent Events): mỗi dòng "data: {json}" với t = delta | status | done | error
  async stream(req: Request, res: Response) {
    const ac = new AbortController();
    res.on("close", () => ac.abort()); // người dùng đóng khung chat/tab
    const send = (o: unknown) => !res.writableEnded && res.write(`data: ${JSON.stringify(o)}\n\n`);
    // Nhịp giữ kết nối: dòng chú thích SSE (giao diện bỏ qua) mỗi 15 giây, để proxy, Cloudflare hay mạng di động không cắt kết nối khi Claude đang suy nghĩ hoặc công cụ đang chạy
    let heartbeat: NodeJS.Timeout | null = null;
    try {
      const out = await chatService.stream(actorOf(req).owner, req.ip, getValidated<ChatBody>(res), {
        signal: ac.signal,
        onStart: () => {
          res.status(200).set({ "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
          res.flushHeaders();
          heartbeat = setInterval(() => !res.writableEnded && res.write(": ping\n\n"), 15_000);
        },
        onDelta: (text) => send({ t: "delta", text }),
        onStatus: (text) => send({ t: "status", text }),
      });
      if (!("aborted" in out)) send({ t: "done" });
    } catch (err) {
      // Chưa gửi header (hết lượt, chatbot tắt...): để error middleware trả mã lỗi JSON như mọi API khác
      if (!res.headersSent) throw err;
      send({ t: "error", message: err instanceof AppError ? err.message : "Mình đang bận chút, bạn thử lại sau ít phút nhé" });
    } finally {
      if (heartbeat) clearInterval(heartbeat);
    }
    res.end();
  },
};
