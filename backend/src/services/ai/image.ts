import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { AI_IMAGE_MAX_EDGE } from "../../constants/ai";

type MediaType = "image/webp" | "image/png" | "image/jpeg";

const MIME: Record<string, MediaType> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

/**
 * Đọc ảnh đề để gửi cho Claude. Đủ nhỏ thì gửi nguyên bản; lớn hơn AI_IMAGE_MAX_EDGE thì thu nhỏ (giữ tỉ lệ,
 * WebP chất lượng cao) để bớt token. Ảnh gốc trên đĩa không đổi.
 */
export async function loadImageForAi(file: string): Promise<{ mediaType: MediaType; data: string }> {
  const mediaType = MIME[path.extname(file).toLowerCase()];
  if (!mediaType) throw new Error(`Định dạng ảnh không được hỗ trợ: ${path.basename(file)}`);

  const raw = await fs.readFile(file);
  const meta = await sharp(raw).metadata().catch(() => null);
  if (!meta?.width || !meta.height || Math.max(meta.width, meta.height) <= AI_IMAGE_MAX_EDGE) {
    return { mediaType, data: raw.toString("base64") };
  }
  const resized = await sharp(raw)
    .resize({ width: AI_IMAGE_MAX_EDGE, height: AI_IMAGE_MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 90 })
    .toBuffer();
  return { mediaType: "image/webp", data: resized.toString("base64") };
}
