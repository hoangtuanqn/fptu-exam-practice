import fs from "node:fs/promises";
import path from "node:path";
import { materialTempDir } from "../../configs/env";

// Tệp PDF tạm của job phân tích slide: thư mục riêng ngoài thư mục ảnh công khai, chỉ tiến trình server đọc được.
// Tệp bị xoá ngay khi job xong (thành công hay lỗi); cron hằng ngày dọn tệp mồ côi.

const NAME = /^(\d+)\.pdf$/;

export interface MaterialTempFiles {
  pathOf(uploadId: number): string;
  write(uploadId: number, data: Uint8Array): Promise<void>;
  read(uploadId: number): Promise<Uint8Array | null>; // null: không còn tệp
  remove(uploadId: number): Promise<void>;
  /** Tệp trong thư mục: id (null nếu tên lạ) và giờ sửa cuối. */
  list(): Promise<{ name: string; uploadId: number | null; mtimeMs: number }[]>;
  removeByName(name: string): Promise<void>;
}

export function createTempFiles(dir = materialTempDir): MaterialTempFiles {
  const pathOf = (uploadId: number) => path.join(dir, `${uploadId}.pdf`);
  const ignoreMissing = (err: unknown) => {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  };
  return {
    pathOf,
    async write(uploadId, data) {
      await fs.mkdir(dir, { recursive: true, mode: 0o700 });
      await fs.writeFile(pathOf(uploadId), data, { mode: 0o600 });
    },
    async read(uploadId) {
      try {
        return new Uint8Array(await fs.readFile(pathOf(uploadId)));
      } catch (err) {
        ignoreMissing(err);
        return null;
      }
    },
    async remove(uploadId) {
      await fs.rm(pathOf(uploadId), { force: true });
    },
    async list() {
      let names: string[];
      try {
        names = await fs.readdir(dir);
      } catch (err) {
        ignoreMissing(err);
        return [];
      }
      const out = [];
      for (const name of names) {
        try {
          const st = await fs.stat(path.join(dir, name));
          if (!st.isFile()) continue;
          const m = NAME.exec(name);
          out.push({ name, uploadId: m ? Number(m[1]) : null, mtimeMs: st.mtimeMs });
        } catch (err) {
          ignoreMissing(err);
        }
      }
      return out;
    },
    async removeByName(name) {
      if (path.basename(name) !== name) return; // chỉ tệp nằm ngay trong thư mục
      await fs.rm(path.join(dir, name), { force: true });
    },
  };
}

export const materialTempFiles = createTempFiles();
