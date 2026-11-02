import { prisma } from "../configs/prisma";

export const settingRepository = {
  async getMany(keys: string[]) {
    const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
    return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string | undefined>;
  },

  setMany: (entries: Record<string, string>) =>
    prisma.$transaction(
      Object.entries(entries).map(([key, value]) =>
        prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } }),
      ),
    ),
};
