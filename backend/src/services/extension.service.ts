import fs from "node:fs";
import path from "node:path";
import { zipSync } from "fflate";
import { AppError } from "../rules/error";

// Mã nguồn tiện ích nằm cạnh backend trong cùng repo (không phục vụ công khai trên web)
const EXT_DIR = path.resolve(__dirname, "../../../chrome-extension");

function collect(dir: string, base = dir, out: Record<string, Uint8Array> = {}) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name.endsWith(".zip")) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(abs, base, out);
    else out[path.relative(base, abs).split(path.sep).join("/")] = new Uint8Array(fs.readFileSync(abs));
  }
  return out;
}

let cache: { version: string; zip: Buffer } | null = null;

export const extensionService = {
  // Nén chrome-extension/ thành zip, nhớ theo phiên bản trong manifest để không nén lại mỗi lần tải
  pack() {
    const manifestPath = path.join(EXT_DIR, "manifest.json");
    if (!fs.existsSync(manifestPath)) throw new AppError("Chưa có bản tiện ích để tải");
    const version = String((JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { version?: string }).version ?? "0");
    if (!cache || cache.version !== version) cache = { version, zip: Buffer.from(zipSync(collect(EXT_DIR), { level: 9 })) };
    return cache;
  },
};
