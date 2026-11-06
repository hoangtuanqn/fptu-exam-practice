import { BASE, ApiError, http, tokenStore } from "@/shared/api/client";

export interface PeDownloadRow {
  id: number;
  threadId: string;
  title: string;
  price: number;
  files: number;
  sizeBytes: number;
  status: "PENDING" | "DONE" | "FAILED";
  error: string | null;
  createdAt: string;
}

export const peApi = {
  price: () => http.get<{ price: number }>("/pe/price"),
  quote: (url: string) => http.get<{ price: number; fee: number; free: boolean }>("/pe/quote", { url }),
  history: () => http.get<{ items: PeDownloadRow[] }>("/pe/history"),

  // Tải file zip (trả về blob). Gọi history trước để token được làm mới nếu sắp hết hạn.
  async download(url: string): Promise<{ blob: Blob; filename: string }> {
    await http.get("/pe/history");
    let res: Response;
    try {
      res = await fetch(`${BASE}/pe/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenStore.get() ?? ""}` },
        body: JSON.stringify({ url }),
        credentials: "include",
      });
    } catch {
      throw new ApiError("Không kết nối được máy chủ", 0);
    }
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new ApiError(json?.message ?? `Lỗi ${res.status}`, res.status);
    }
    const cd = res.headers.get("content-disposition") ?? "";
    const star = cd.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    const plain = cd.match(/filename="?([^";]+)"?/i)?.[1];
    return { blob: await res.blob(), filename: star ? decodeURIComponent(star) : (plain ?? "de-thi-pe.zip") };
  },
};
