import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { env } from "../configs/env";
import { userRepository } from "../repositories/user.repository";
import { crawlJobService } from "../services/crawl-job.service";
import { topicLabelerService } from "../services/ai/topic-labeler.service";
import { examService } from "../services/exam.service";
import type { Actor } from "../utils/actor";
import { verifyToken } from "../utils/jwt";
import { ADMIN_ROOM, EVENTS, SOCKET_PATH, roomOf, type RoomKind } from "./events";
import { examPayload, jobPayload, questionsPayload, realtimeHub } from "./hub";

const GUEST_ID = /^[A-Za-z0-9-]{16,64}$/;
const KINDS: RoomKind[] = ["exam", "job"];

// Cùng quy tắc với middleware identify: có token thì phải hợp lệ, không thì cần guestId
async function identifySocket(auth: Record<string, unknown>): Promise<Actor> {
  const token = typeof auth.token === "string" && auth.token ? auth.token : null;
  const guestId = typeof auth.guestId === "string" && GUEST_ID.test(auth.guestId) ? auth.guestId : null;

  if (token) {
    const user = await userRepository.findById(Number(verifyToken(token).sub));
    if (!user || user.status === "BANNED") throw new Error("unauthorized");
    return { owner: { userId: user.id }, isAdmin: user.role === "ADMIN" };
  }
  if (!guestId) throw new Error("unauthorized");
  return { owner: { guestId }, isAdmin: false };
}

// Vào phòng của một đề/job (chỉ khi có quyền xem) rồi gửi ngay trạng thái hiện tại để không lỡ sự kiện nào
async function subscribe(socket: Socket, actor: Actor, kind: RoomKind, id: number) {
  if (kind === "exam") {
    await examService.assertAccess(actor, id);
    await socket.join(roomOf(kind, id));
    const payload = await examPayload(id);
    if (payload) socket.emit(EVENTS.examAnswers, payload);
    // Gửi các câu đã có để không lỡ câu nào tải xong trước khi vào phòng (kể cả khi đề vừa đủ câu: giao diện còn đang thiếu)
    const loaded = await questionsPayload(id);
    if (loaded) socket.emit(EVENTS.examQuestions, loaded);
    if (topicLabelerService.isRunning(id)) socket.emit(EVENTS.examTopics, { examId: id, state: "running", topics: [] });
  } else {
    await crawlJobService.getForActor(id, actor); // ném lỗi nếu không phải job của người này
    await socket.join(roomOf(kind, id));
    const payload = await jobPayload(id);
    if (payload) socket.emit(EVENTS.jobUpdate, payload);
  }
}

export function initRealtime(server: HttpServer) {
  const io = new Server(server, { path: SOCKET_PATH, cors: { origin: env.CLIENT_URL, credentials: true } });
  realtimeHub.attach(io);

  io.use(async (socket, next) => {
    try {
      socket.data.actor = await identifySocket(socket.handshake.auth ?? {});
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const actor = socket.data.actor as Actor;
    if (actor.isAdmin) void socket.join(ADMIN_ROOM); // admin tự nhận thông báo mới, không cần đăng ký

    socket.on(EVENTS.subscribe, async (msg: { room?: string; id?: unknown }, ack?: (ok: boolean) => void) => {
      const kind = KINDS.find((k) => k === msg?.room);
      const id = Number(msg?.id);
      if (!kind || !Number.isInteger(id) || id <= 0) return ack?.(false);
      try {
        await subscribe(socket, actor, kind, id);
        ack?.(true);
      } catch {
        ack?.(false); // không có quyền hoặc không tồn tại: không tiết lộ lý do
      }
    });

    socket.on(EVENTS.unsubscribe, (msg: { room?: string; id?: unknown }) => {
      const kind = KINDS.find((k) => k === msg?.room);
      const id = Number(msg?.id);
      if (kind && Number.isInteger(id)) void socket.leave(roomOf(kind, id));
    });
  });

  return io;
}
