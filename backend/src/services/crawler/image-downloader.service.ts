import fs from "node:fs/promises";
import path from "node:path";
import { FUO_AUTH_MESSAGE, FuoAuthError, type FuoClient } from "./fuo-client";
import type { DownloadedImage, ImageRef } from "./types";
import { processExamImage } from "./watermark.service";

const errMsg = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

export async function downloadImage(
  client: FuoClient,
  image: ImageRef,
  dir: string,
): Promise<DownloadedImage> {
  // 1. Tải
  let input: Buffer;
  try {
    const res = await client.fetchOk(image.url, {
      accept: "image/webp,image/*,*/*;q=0.8",
    });
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) throw new FuoAuthError(image.url);
    input = Buffer.from(await res.arrayBuffer());
  } catch (err) {
    if (err instanceof FuoAuthError)
      throw new Error(FUO_AUTH_MESSAGE, { cause: err });
    throw new Error(`Không tải được ${image.name}: ${errMsg(err)}`, {
      cause: err,
    });
  }

  // 2. Xử lý ảnh
  let output: Buffer;
  try {
    output = await processExamImage(input, client.config.webpQuality);
  } catch (err) {
    throw new Error(`Không xử lý được ảnh ${image.name}: ${errMsg(err)}`, {
      cause: err,
    });
  }

  // 3. Ghi atomic: file tạm → rename
  const file = `${image.fileBase}.webp`;
  const target = path.join(dir, file);
  const tmp = `${target}.tmp`;
  try {
    await fs.writeFile(tmp, output);
    await fs.rename(tmp, target);
  } catch (err) {
    await fs.rm(tmp, { force: true });
    throw new Error(`Không ghi được ${file}: ${errMsg(err)}`, { cause: err });
  }

  return { image, file };
}
