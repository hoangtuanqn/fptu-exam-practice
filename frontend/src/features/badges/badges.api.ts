import { http } from "@/shared/api/client";

export type BadgeTierLevel = 0 | 1 | 2 | 3;

export interface BadgeTier {
  level: 1 | 2 | 3;
  threshold: number;
  label: string;
}

export interface MyBadge {
  key: string;
  category: string;
  name: string;
  description: string;
  icon: string;
  tiers: BadgeTier[];
  tier: BadgeTierLevel; // 0 = chưa đạt
  progress: { current: number; next: number | null }; // next null = đã đạt bậc cao nhất
  earnedAt: string | null;
  pinned: boolean;
}

export interface MyBadges {
  items: MyBadge[];
  pinned: string[];
}

export interface AdminBadgeStat {
  key: string;
  name: string;
  holders: number;
  byTier: number[]; // [bậc 1, bậc 2, bậc 3]
}

export const MAX_PINNED = 3;

export const badgesApi = {
  mine: () => http.get<MyBadges>("/badges/me"),
  pin: (keys: string[]) => http.put<MyBadges>("/badges/me/pins", { keys }),
  // Máy chủ trả mảng; chấp nhận cả dạng { items } cho chắc
  adminStats: async () => {
    const res = await http.get<AdminBadgeStat[] | { items: AdminBadgeStat[] }>("/admin/badges");
    return Array.isArray(res) ? res : (res?.items ?? []);
  },
};
