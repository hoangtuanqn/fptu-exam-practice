import { Prisma, type BroadcastStatus } from "@prisma/client";
import { prisma } from "../configs/prisma";
import type { BroadcastSegment } from "../constants/marketing";

export interface BroadcastInput {
  subject: string;
  body: string;
  ctaLabel: string;
  ctaPath: string;
  segment: BroadcastSegment;
  segmentDays: number | null;
  createdById: number;
}

const isUniqueViolation = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

// Chuyển trạng thái có điều kiện (chỉ từ các trạng thái `from`): trả false nếu trạng thái đã đổi trước đó
const move = async (id: number, from: BroadcastStatus[], to: BroadcastStatus) =>
  (await prisma.marketingBroadcast.updateMany({ where: { id, status: { in: from } }, data: { status: to, sendingLock: to === "SENDING" ? true : null } })).count === 1;

export const broadcastRepository = {
  create: (data: BroadcastInput) => prisma.marketingBroadcast.create({ data }),

  find: (id: number) => prisma.marketingBroadcast.findUnique({ where: { id } }),

  // Đợt đang gửi (tối đa một: unique sending_lock)
  sending: () => prisma.marketingBroadcast.findUnique({ where: { sendingLock: true } }),

  async list(skip: number, take: number) {
    const [items, total] = await Promise.all([prisma.marketingBroadcast.findMany({ orderBy: { id: "desc" }, skip, take }), prisma.marketingBroadcast.count()]);
    return { items, total };
  },

  /** DRAFT -> SENDING. "busy" khi đã có đợt khác đang gửi (unique sending_lock chặn cả hai yêu cầu cùng lúc), "state" khi không còn là DRAFT. */
  async start(id: number): Promise<"ok" | "busy" | "state"> {
    try {
      return (await move(id, ["DRAFT"], "SENDING")) ? "ok" : "state";
    } catch (err) {
      if (isUniqueViolation(err)) return "busy";
      throw err;
    }
  },

  cancel: (id: number) => move(id, ["DRAFT", "SENDING"], "CANCELLED"),
  finish: (id: number) => move(id, ["SENDING"], "DONE"),
};
