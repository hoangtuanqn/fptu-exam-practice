import { useEffect, useState } from "react";
import { http } from "@/shared/api/client";
import type { PublicOffers } from "@/shared/types/api";

type Flags = Required<NonNullable<PublicOffers["upsell"]>>;
const OFF: Flags = { result: false, reviewCap: false, depositTier: false, firstRun: false, proNudge: false };

let cached: Promise<PublicOffers> | null = null;
const load = () =>
  (cached ??= http.get<PublicOffers>("/public/offers").catch((e: unknown) => {
    cached = null; // lần sau thử lại
    throw e;
  }));

// Công tắc lời mời nâng cấp do admin điều khiển, kèm giá giải thích lẻ. Chưa tải được hoặc máy chủ cũ: tắt hết.
export function useUpsell() {
  const [offers, setOffers] = useState<PublicOffers | null>(null);
  useEffect(() => {
    let alive = true;
    load()
      .then((o) => alive && setOffers(o))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return { flags: offers?.upsell ? { ...OFF, ...offers.upsell } : OFF, explainPrice: offers?.explainPrice ?? 0, bonusTiers: offers?.depositBonusTiers ?? [] };
}
