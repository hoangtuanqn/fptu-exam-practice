import { http } from "@/shared/api/client";
import type { AdsPublicConfig } from "./ads.rules";

export const adsApi = {
  config: () => http.get<AdsPublicConfig>("/ads/config"),
};
