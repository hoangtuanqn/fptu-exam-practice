// Nén chrome-extension/ thành dist/fepass_extension.zip (web phục vụ ở /fepass_extension.zip).
// Chạy tự động sau mỗi `npm run build`; cũng chạy tay được: node scripts/pack-extension.mjs
import fs from "node:fs";
import path from "node:path";
import { zipSync } from "fflate";

const frontend = path.resolve(import.meta.dirname, "..");
const root = path.resolve(frontend, "..");
const dist = path.join(frontend, "dist");
const extDir = path.join(root, "chrome-extension");

// Đọc đệ quy thư mục thành { "đường/dẫn/posix": [dữ liệu, {mtime}] }, bỏ qua file ẩn, node_modules và chính file zip cũ
function collect(dir, base = dir, out = {}) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "fepass_extension.zip") continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(abs, base, out);
    else out[path.relative(base, abs).split(path.sep).join("/")] = [new Uint8Array(fs.readFileSync(abs)), { mtime: fs.statSync(abs).mtime }];
  }
  return out;
}

export function packExtension() {
  const manifest = JSON.parse(fs.readFileSync(path.join(extDir, "manifest.json"), "utf8"));
  const published = JSON.parse(fs.readFileSync(path.join(frontend, "public", "extension-version.json"), "utf8"));
  if (manifest.version !== published.version) {
    console.warn(`\x1b[33m!!  Phiên bản tiện ích không khớp: manifest ${manifest.version}, public/extension-version.json ${published.version}. Người dùng sẽ không được báo cập nhật đúng.\x1b[0m`);
  }
  if (!fs.existsSync(dist)) throw new Error("chưa có frontend/dist: build trước rồi mới nén tiện ích");
  const files = collect(extDir);
  if (!files["manifest.json"]) throw new Error("không thấy chrome-extension/manifest.json");
  const zip = zipSync(files, { level: 9 });
  fs.writeFileSync(path.join(dist, "fepass_extension.zip"), zip);
  console.log(`\x1b[36m==> Tiện ích Chrome v${manifest.version}: ${Object.keys(files).length} file → dist/fepass_extension.zip (${Math.round(zip.length / 1024)} KB)\x1b[0m`);
  return { version: manifest.version, files: Object.keys(files).length, bytes: zip.length };
}

if (import.meta.filename === path.resolve(process.argv[1] ?? "")) packExtension();
