import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { FUO_AUTH_MESSAGE, FuoAuthError, type FuoClient } from "./fuo-client";
import type { DownloadedImage, ImageRef } from "./types";

async function downloadAsWebp(client: FuoClient, image: ImageRef, dir: string): Promise<DownloadedImage> {
  const res = await client.fetchOk(image.url, { accept: "image/webp,image/*,*/*;q=0.8" });
  // Chưa đăng nhập thì ảnh gốc trả về trang HTML
  if (!(res.headers.get("content-type") ?? "").startsWith("image/")) throw new FuoAuthError(image.url);

  const input = Buffer.from(await res.arrayBuffer());
  const file = `${image.fileBase}.webp`;
  await sharp(input, { animated: true }).webp({ quality: client.config.webpQuality }).toFile(path.join(dir, file));
  return { image, file };
}

/**
 * Tải tuần tự vào `dir` và đổi sang WebP. Thiếu một ảnh là đề không dùng được,
 * nên mọi lỗi đều dừng cả lô (lỗi đăng nhập có thông báo riêng). Kết quả cùng thứ tự với `images`.
 */
export async function downloadAll(
  client: FuoClient,
  images: ImageRef[],
  dir: string,
  onProgress?: (done: number, total: number) => Promise<void> | void,
): Promise<DownloadedImage[]> {
  await fs.mkdir(dir, { recursive: true });

  const out: DownloadedImage[] = [];
  for (const [i, image] of images.entries()) {
    try {
      out.push(await downloadAsWebp(client, image, dir));
    } catch (err) {
      if (err instanceof FuoAuthError) throw new Error(FUO_AUTH_MESSAGE);
      throw new Error(`Không tải được ${image.name}: ${(err as Error).message}`);
    }
    await onProgress?.(i + 1, images.length);
    await client.pause();
  }
  return out;
}
