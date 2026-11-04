import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { FUO_AUTH_MESSAGE, FuoAuthError, type FuoClient } from "./fuo-client";
import type { DownloadedImage, ImageRef } from "./types";

/**
 * Tải một ảnh vào `dir` dưới dạng WebP. Ảnh nguồn đã là WebP thì ghi thẳng (không mã hóa lại: nhanh hơn, không mất chất lượng),
 * định dạng khác mới đổi sang WebP. Mọi lỗi đều ném ra với lời nhắn rõ ràng (lỗi đăng nhập có thông báo riêng).
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
    if (type.startsWith("image/webp")) await fs.writeFile(target, input);
    else await sharp(input, { animated: true }).webp({ quality: client.config.webpQuality }).toFile(target);
    return { image, file };
  } catch (err) {
    if (err instanceof FuoAuthError) throw new Error(FUO_AUTH_MESSAGE);
    throw new Error(`Không tải được ${image.name}: ${(err as Error).message}`);
  }
}
