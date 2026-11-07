import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { storageDir } from "../configs/env";

const AVATARS_DIR = path.join(storageDir, "avatars");

// Đảm bảo thư mục avatars tồn tại (gọi lười một lần)
let dirReady: Promise<void> | null = null;
const ensureDir = () => (dirReady ??= fs.mkdir(AVATARS_DIR, { recursive: true }).then(() => undefined));

export const avatarService = {
  // Nhận buffer ảnh thô, nén + chuyển WebP 256×256, lưu vào storage, trả về đường dẫn tương đối
  async upload(userId: number, buffer: Buffer): Promise<string> {
    await ensureDir();
    // Tên file khác nhau mỗi lần tải: file tĩnh được cache 7 ngày (immutable), dùng chung một tên thì trình duyệt cứ hiện ảnh cũ sau khi đổi
    const relativePath = `avatars/${userId}-${Date.now().toString(36)}.webp`;
    const dest = path.join(storageDir, relativePath);
    await sharp(buffer)
      .resize(256, 256, { fit: "cover", position: "centre" })
      .webp({ quality: 80 })
      .toFile(dest);
    return relativePath;
  },

  // Xoá file avatar cũ (bỏ qua nếu không tồn tại)
  async remove(avatarPath: string): Promise<void> {
    try {
      await fs.unlink(path.join(storageDir, avatarPath));
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  },
};
