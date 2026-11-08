// Một lệnh làm xong mọi thứ để đưa frontend lên hosting:  npm run release   (hoặc bấm đúp release.cmd ở thư mục gốc)
//   1. Build frontend (tsc + vite build) ra frontend/dist
//   2. Nén chrome-extension/ thành fepass_extension.zip và đặt vào dist (web phục vụ ở /fepass_extension.zip)
//   3. Nén toàn bộ dist (kể cả .htaccess và file xác minh Google) thành release/fepass-web.zip
// Trên hosting chỉ cần giải nén fepass-web.zip vào thư mục gốc của web (public_html), rồi Purge Everything trên Cloudflare.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { zipSync } from "fflate";

const frontend = path.resolve(import.meta.dirname, "..");
const root = path.resolve(frontend, "..");
const dist = path.join(frontend, "dist");
const extDir = path.join(root, "chrome-extension");
const outDir = path.join(root, "release");

const fmt = (bytes) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${Math.round(bytes / 1024)} KB`);
const step = (msg) => console.log(`\n\x1b[36m==> ${msg}\x1b[0m`);
const warn = (msg) => console.log(`\x1b[33m!!  ${msg}\x1b[0m`);
const fail = (msg) => {
  console.error(`\x1b[31mLỗi: ${msg}\x1b[0m`);
  process.exit(1);
};

// Đọc đệ quy một thư mục thành { "đường/dẫn/posix": [dữ liệu, {mtime}] } (kể cả file ẩn như .htaccess), bỏ qua những tên trong `skip`
function collect(dir, skip = () => false, base = dir, out = {}) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(base, abs).split(path.sep).join("/");
    if (skip(rel, entry)) continue;
    if (entry.isDirectory()) collect(abs, skip, base, out);
    else out[rel] = [new Uint8Array(fs.readFileSync(abs)), { mtime: fs.statSync(abs).mtime }];
  }
  return out;
}

// --- 0. Kiểm tra nhanh phiên bản tiện ích: file version công khai phải khớp manifest, nếu không người dùng sẽ không được báo cập nhật
const manifest = JSON.parse(fs.readFileSync(path.join(extDir, "manifest.json"), "utf8"));
const published = JSON.parse(fs.readFileSync(path.join(frontend, "public", "extension-version.json"), "utf8"));
if (manifest.version !== published.version) warn(`Phiên bản tiện ích không khớp: manifest ${manifest.version}, extension-version.json ${published.version}`);

// --- 1. Build
step("Build frontend (tsc + vite build)");
try {
  execSync("npm run build", { cwd: frontend, stdio: "inherit" });
} catch {
  fail("build thất bại, xem lỗi ở trên.");
}

// --- 2. Nén tiện ích Chrome vào dist
step(`Nén tiện ích Chrome (v${manifest.version})`);
const extFiles = collect(extDir, (rel, e) => e.name === "fepass_extension.zip" || e.name.startsWith(".") || e.name === "node_modules");
if (!extFiles["manifest.json"]) fail("không thấy chrome-extension/manifest.json");
const extZip = zipSync(extFiles, { level: 9 });
fs.writeFileSync(path.join(dist, "fepass_extension.zip"), extZip);
console.log(`   ${Object.keys(extFiles).length} file → dist/fepass_extension.zip (${fmt(extZip.length)})`);

// --- 3. Nén cả dist thành một file để upload một lần
step("Nén toàn bộ web thành một file");
const webFiles = collect(dist);
const webZip = zipSync(webFiles, { level: 9 });
fs.mkdirSync(outDir, { recursive: true });
const webPath = path.join(outDir, "fepass-web.zip");
fs.writeFileSync(webPath, webZip);
console.log(`   ${Object.keys(webFiles).length} file → ${path.relative(root, webPath)} (${fmt(webZip.length)})`);

// --- Kiểm tra các file bắt buộc đã nằm trong gói (đặc biệt .htaccess và file xác minh Google do bạn thêm tay)
step("Kiểm tra nội dung gói");
const required = ["index.html", ".htaccess", "robots.txt", "sitemap.xml", "fepass_extension.zip", "extension-version.json", "og-cover.jpg"];
const google = Object.keys(webFiles).filter((f) => /^google[\w-]+\.html$/.test(f));
let ok = true;
for (const f of required) {
  const has = !!webFiles[f];
  if (!has) ok = false;
  console.log(`   ${has ? "✔" : "✘"} ${f}`);
}
console.log(`   ${google.length ? "✔" : "✘"} file xác minh Google ${google.join(", ")}`);
if (!google.length) ok = false;
if (!ok) warn("Thiếu file bắt buộc ở trên: kiểm tra frontend/public rồi chạy lại.");

console.log(`\n\x1b[32mXong.\x1b[0m File để upload: ${webPath}`);
console.log("Trên hosting: giải nén vào thư mục gốc của web (public_html), ghi đè file cũ; sau đó Purge Everything ở Cloudflare.");
if (!/\/$/.test("") && fs.readFileSync(path.join(frontend, "public", ".htaccess"), "utf8").includes("RewriteBase /subdirectory")) {
  warn('.htaccess đang có "RewriteBase /subdirectory" (giá trị mẫu). Web ở thư mục gốc nên đổi thành "RewriteBase /" cho đúng.');
}
