import { prisma } from "../configs/prisma";

export const promptEventRepository = {
  create: (userId: number, surface: string, event: string) => prisma.promptEvent.create({ data: { userId, surface, event }, select: { id: true } }),

  // Number of events per prompt and event name since a date
  countSince: (since: Date) =>
    prisma.promptEvent.groupBy({ by: ["surface", "event"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
};
