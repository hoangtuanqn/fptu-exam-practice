import { BASE, ApiError, http, tokenStore } from "@/shared/api/client";

// Tải file zip tiện ích Chrome. Chỉ người đã đăng nhập tải được (không còn file công khai trên website).
export async function downloadExtension(): Promise<void> {
  await http.get("/users/me").catch(() => undefined); // làm mới token nếu sắp hết hạn
  let res: Response;
  try {
    res = await fetch(`${BASE}/extension/download`, { headers: { Authorization: `Bearer ${tokenStore.get() ?? ""}` }, credentials: "include" });
  } catch {
    throw new ApiError("Không kết nối được máy chủ", 0);
  }
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(json?.message ?? `Lỗi ${res.status}`, res.status);
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(await res.blob());
  a.download = "fepass_extension.zip";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}
