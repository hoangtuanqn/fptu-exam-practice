import { getGuestId } from "./guest";
import { refreshAccessToken, tokenStore } from "./client";

// Ảnh đề không còn là link công khai: máy chủ chỉ trả khi request kèm danh tính (token hoặc ID khách) và đề thuộc kho của người xem.
// Nên ảnh được tải bằng fetch có header rồi hiển thị bằng blob: URL (chỉ sống trong tab này), không có link ảnh để sao chép đem dùng chỗ khác.

const MAX_CACHED = 120; // số ảnh giữ trong bộ nhớ trang (webp vài trăm KB): đủ cho đề dài và tải trước các câu kế tiếp
const cache = new Map<string, Promise<Blob>>(); // thứ tự thêm vào = thứ tự dùng gần nhất (bốc ra rồi bỏ lại cuối khi dùng)

async function download(url: string, retried = false): Promise<Blob> {
  const token = tokenStore.get();
  const res = await fetch(url, {
    headers: { "X-Guest-Id": getGuestId(), ...(token && { Authorization: `Bearer ${token}` }) },
    credentials: "include",
  });
  if (res.status === 401 && token && !retried && (await refreshAccessToken()) === "ok") return download(url, true);
  if (!res.ok) throw new Error(`Không tải được ảnh (${res.status})`);
  return res.blob();
}

/** Nội dung ảnh (cache theo URL). Tải lỗi thì bỏ khỏi cache để lần sau thử lại. */
export function fetchImageBlob(url: string): Promise<Blob> {
  if (/^(blob|data):/.test(url)) return fetch(url).then((r) => r.blob());
  let hit = cache.get(url);
  if (hit) {
    cache.delete(url);
  } else {
    hit = download(url);
    hit.catch(() => cache.delete(url));
  }
  cache.set(url, hit);
  while (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value!);
  return hit;
}

/** Tải trước để bấm sang câu kế tiếp là hiện ngay. Lỗi thì bỏ qua (lúc hiển thị sẽ tải lại). */
export const prefetchImage = (url: string) => void fetchImageBlob(url).catch(() => undefined);

/** Mở ảnh ở tab mới (thay cho link trực tiếp, vì link ảnh không còn dùng được khi chưa kèm danh tính). Mở tab ngay trong lượt bấm để không bị chặn popup. */
export async function openProtectedImage(url: string) {
  if (/^(blob|data):/.test(url)) return void window.open(url, "_blank", "noopener");
  const tab = window.open("", "_blank");
  try {
    const blobUrl = URL.createObjectURL(await fetchImageBlob(url));
    if (tab) tab.location.href = blobUrl;
    else window.open(blobUrl, "_blank");
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } catch {
    tab?.close();
  }
}

/** Tải ảnh về máy với tên cho trước (ảnh cần danh tính nên không dùng link trực tiếp được). */
export async function downloadProtectedImage(url: string, filename: string) {
  const blobUrl = URL.createObjectURL(await fetchImageBlob(url));
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
}

export const openImageHandler = (url: string) => (e: { preventDefault: () => void }) => {
  e.preventDefault();
  void openProtectedImage(url);
};
