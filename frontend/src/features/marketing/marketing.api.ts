import { http } from "@/shared/api/client";

export const marketingApi = {
  unsubscribe: (token: string) => http.post<{ ok: boolean }>("/marketing/unsubscribe", { token }),
};
