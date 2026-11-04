import fs from "node:fs/promises";
import path from "node:path";
import { FUO_AUTH_MESSAGE, FuoAuthError, type FuoClient } from "./fuo-client";
import type { DownloadedImage, ImageRef } from "./types";
import { stampWatermark } from "./watermark.service";

/**
 * Tải một ảnh vào `dir` dưới dạng WebP, đóng dấu logo vào góc dưới bên phải rồi mới ghi xuống đĩa. Mọi lỗi đều ném ra với lời nhắn rõ ràng (lỗi đăng nhập có thông báo riêng).
 */
export async function downloadImage(client: FuoClient, image: ImageRef, dir: string): Promise<DownloadedImage> {
  try {
    const res = await client.fetchOk(image.url, { accept: "image/webp,image/*,*/*;q=0.8" });
    const type = res.headers.get("content-type") ?? "";
    // Chưa đăng nhập thì ảnh gốc trả về trang HTML
    if (!type.startsWith("image/")) throw new FuoAuthError(image.url);

    const input = Buffer.from(await res.arrayBuffer());
    const file = `${image.fileBase}.webp`;
    const target = path.join(dir, file);
    await fs.writeFile(target, await stampWatermark(input, client.config.webpQuality));
    return { image, file };
  } catch (err) {
    if (err instanceof FuoAuthError) throw new Error(FUO_AUTH_MESSAGE);
    throw new Error(`Không tải được ${image.name}: ${(err as Error).message}`);
  }
}
