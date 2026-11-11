// Kiểm tra phiên bản tiện ích sau mỗi `npm run build` (cũng chạy tay được: node scripts/pack-extension.mjs).
// Không còn nén zip vào dist: tiện ích chỉ tải qua API sau khi đăng nhập (backend nén từ chrome-extension/).
import fs from "node:fs";
import path from "node:path";

const frontend = path.resolve(import.meta.dirname, "..");
const root = path.resolve(frontend, "..");
const extDir = path.join(root, "chrome-extension");

export function packExtension() {
  const manifest = JSON.parse(fs.readFileSync(path.join(extDir, "manifest.json"), "utf8"));
  const published = JSON.parse(fs.readFileSync(path.join(frontend, "public", "extension-version.json"), "utf8"));
  if (manifest.version !== published.version) {
    console.warn(`\x1b[33m!!  Phiên bản tiện ích không khớp: manifest ${manifest.version}, public/extension-version.json ${published.version}. Người dùng sẽ không được báo cập nhật đúng.\x1b[0m`);
  }
  // Phiên bản mới nhất trong lịch sử thay đổi (hiện cho người dùng ở /changelog) phải khớp manifest
  const logged = JSON.parse(fs.readFileSync(path.join(frontend, "src", "features", "changelog", "changelog.json"), "utf8")).extension?.[0]?.version;
  if (logged !== manifest.version) {
    console.warn(`\x1b[33m!!  Lịch sử thay đổi của tiện ích đang ghi v${logged}, nhưng manifest là v${manifest.version}. Thêm mục v${manifest.version} vào đầu "extension" trong src/features/changelog/changelog.json.\x1b[0m`);
  }
  console.log(`[36m==> Tiện ích Chrome v${manifest.version} (không đóng gói vào web)[0m`);
  return { version: manifest.version };
}

if (import.meta.filename === path.resolve(process.argv[1] ?? "")) packExtension();
