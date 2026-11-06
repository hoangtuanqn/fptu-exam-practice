import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import { zipSync } from "fflate";
import { prisma } from "../configs/prisma";
import { storageDir } from "../configs/env";
import { PE_LABEL, PE_MAX_FILE_BYTES, PE_MAX_FILES, PE_MAX_TOTAL_BYTES, PE_PRICE, PE_STORAGE_DIR } from "../constants/pe";
import { AppError } from "../rules/error";
import { parseThreadId, threadUrl } from "../utils/fuo-url";
import { sanitizeName, uniqueName } from "../utils/filename";
import { crawlerSettingService } from "./crawler-setting.service";
import { createFuoClient, FuoAuthError, FUO_AUTH_MESSAGE, type FuoClient } from "./crawler/fuo-client";
import { fuoSessionService, isFuoAuthFailure } from "./crawler/fuo-session.service";
import { extractTitle } from "./crawler/thread-scraper.service";
import { walletService } from "./wallet.service";

const norm = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
const MAX_PAGES = 30;

const hasPeLabel = (html: string) =>
  cheerio.load(html)("h1.p-title-value .label, h1.p-title-value .labelLink").toArray().some((el) => norm(cheerio.load(html)(el).text()) === norm(PE_LABEL));

interface Attachment {
  url: string;
  name: string;
}

// Mọi file đính kèm của thread (trang nào cũng có): liên kết /attachments/... trong bài viết
function extractAttachments(html: string, base: string): Attachment[] {
  const $ = cheerio.load(html);
  const out: Attachment[] = [];
  $('.message-attachments a[href*="/attachments/"], .attachment a[href*="/attachments/"], .bbWrapper a[href*="/attachments/"]').each((_, el) => {
    const a = $(el);
    const href = a.attr("href");
    if (!href) return;
    const abs = new URL(href, base);
    abs.search = abs.search.replace(/[?&]hash=[^&]*/g, (m) => m); // giữ nguyên token (nếu có)
    const text = a.text().trim() || a.find("img").attr("alt") || a.attr("title") || "";
    const slug = decodeURIComponent(abs.pathname.split("/").filter(Boolean).pop() ?? "").replace(/\.\d+$/, "");
    out.push({ url: abs.href, name: sanitizeName(text.includes(".") ? text : slug.replace(/-([A-Za-z0-9]{2,5})$/, ".$1"), "file") });
  });
  return out;
}

async function collect(client: FuoClient, threadId: string) {
  const attachments = new Map<string, Attachment>();
  const visited = new Set<string>();
  let next: string | null = threadUrl(threadId);
  let title = "";
  while (next && !visited.has(next) && visited.size < MAX_PAGES) {
    visited.add(next);
    const html: string = await (await client.fetchOk(next)).text();
    if (!title) {
      if (!hasPeLabel(html)) throw new AppError(`Chỉ tải được các bài có nhãn "${PE_LABEL}".`);
      title = extractTitle(html);
    }
    for (const att of extractAttachments(html, next)) attachments.set(new URL(att.url).pathname, att);
    const rel = cheerio.load(html)("a.pageNav-jump--next").attr("href");
    next = rel ? new URL(rel, next).href : null;
    if (next) await client.pause();
  }
  return { title, files: [...attachments.values()] };
}

async function buildZip(threadId: string): Promise<{ title: string; file: string; files: number; size: number }> {
  const dir = path.join(storageDir, PE_STORAGE_DIR);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${threadId}.zip`);
  const meta = path.join(dir, `${threadId}.json`);

  // Đã dựng từ trước thì dùng lại (không cào lại FuOverflow)
  try {
    const m = JSON.parse(await fs.readFile(meta, "utf-8")) as { title: string; files: number };
    const st = await fs.stat(file);
    return { title: m.title, file, files: m.files, size: st.size };
  } catch {
    /* chưa có: dựng mới */
  }

  await fuoSessionService.ensureCookie();
  const run = async () => {
    const client = createFuoClient(await crawlerSettingService.get());
    const { title, files } = await collect(client, threadId);
    if (!files.length) throw new AppError("Bài này không có tệp đính kèm nào để tải.");
    if (files.length > PE_MAX_FILES) throw new AppError(`Bài có quá nhiều tệp (${files.length}).`);

    const used = new Set<string>();
    const entries: Record<string, Uint8Array> = {};
    let total = 0;
    for (const att of files) {
      await client.pause();
      const res = await client.fetchOk(att.url, { accept: "*/*" });
      if ((res.headers.get("content-type") ?? "").startsWith("text/html")) throw new FuoAuthError(att.url); // bị đưa về trang đăng nhập
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > PE_MAX_FILE_BYTES) throw new AppError(`Tệp "${att.name}" quá lớn.`);
      total += buf.length;
      if (total > PE_MAX_TOTAL_BYTES) throw new AppError("Tổng dung lượng tài nguyên quá lớn.");
      const ext = path.extname(att.name);
      entries[uniqueName(path.basename(att.name, ext), used) + ext] = new Uint8Array(buf);
    }
    const zip = Buffer.from(zipSync(entries, { level: 6 }));
    const tmp = `${file}.tmp`;
    await fs.writeFile(tmp, zip);
    await fs.rename(tmp, file);
    await fs.writeFile(meta, JSON.stringify({ title, files: files.length }));
    return { title, file, files: files.length, size: zip.length };
  };

  try {
    return await run();
  } catch (err) {
    if (isFuoAuthFailure(err) && (await fuoSessionService.login()).ok) return run(); // cookie hết hạn: đăng nhập lại một lần
    if (isFuoAuthFailure(err)) throw new AppError(FUO_AUTH_MESSAGE, 502);
    throw err;
  }
}

export const peService = {
  price: () => ({ price: PE_PRICE }),

  // Đã trả phí tải đề này thành công một lần thì các lần sau miễn phí
  async hasPaid(userId: number, threadId: string) {
    return (await prisma.peDownload.count({ where: { userId, threadId, status: "DONE", price: { gt: 0 } } })) > 0;
  },

  async quote(userId: number, url: string) {
    const threadId = parseThreadId(url);
    if (!threadId) throw new AppError("Link không hợp lệ");
    const free = await this.hasPaid(userId, threadId);
    return { price: PE_PRICE, fee: free ? 0 : PE_PRICE, free };
  },

  /**
   * Tải bộ tài nguyên đề PE: trừ PE_PRICE credit mỗi lần, ghi lịch sử. Không dựng được zip thì hoàn phí đúng số đã trừ.
   * Trả đường dẫn file zip để controller gửi về.
   */
  async download(userId: number, url: string) {
    const threadId = parseThreadId(url);
    if (!threadId) throw new AppError("Link không hợp lệ");

    const fee = (await this.hasPaid(userId, threadId)) ? 0 : PE_PRICE; // đã trả tiền rồi thì tải lại miễn phí
    const row = await prisma.$transaction(async (tx) => {
      if (fee > 0) await walletService.charge(tx, { userId, amount: fee, type: "PE_CHARGE", note: `Tải đề PE thread ${threadId}` });
      return tx.peDownload.create({ data: { userId, threadId, title: `Thread ${threadId}`, price: fee } });
    });

    try {
      const built = await buildZip(threadId);
      await prisma.peDownload.update({ where: { id: row.id }, data: { status: "DONE", title: built.title.slice(0, 255), files: built.files, sizeBytes: built.size } });
      return { file: built.file, filename: `${sanitizeName(built.title, threadId)}.zip` };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định";
      console.error(`[pe] thread ${threadId} lỗi: ${message}`);
      await prisma.$transaction(async (tx) => {
        await tx.peDownload.update({ where: { id: row.id }, data: { status: "FAILED", error: message.slice(0, 500) } });
        if (fee > 0) await walletService.applyChange(tx, { userId, amount: fee, type: "PE_REFUND", note: `Hoàn phí tải đề PE thread ${threadId} (lỗi)` });
      });
      throw err instanceof AppError ? new AppError(`${err.message} Bạn không bị trừ credit.`, err.status) : new AppError("Không tải được tài nguyên đề PE. Bạn không bị trừ credit, vui lòng thử lại sau.", 502);
    }
  },

  async history(userId: number) {
    const items = await prisma.peDownload.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 });
    return { items };
  },
};
