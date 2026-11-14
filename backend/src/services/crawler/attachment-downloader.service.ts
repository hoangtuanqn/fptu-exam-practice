import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_TOTAL_MAX_BYTES } from "../../constants/crawler";
import { attachmentType } from "../../utils/attachment";
import { isFuoHttpsUrl } from "../../utils/fuo-url";
import { FUO_AUTH_MESSAGE, FuoAuthError, type FuoClient } from "./fuo-client";
import type { FileRef } from "./types";

export interface DownloadedFile {
  file: FileRef;
  /** Tên đã lưu trong thư mục files/, VD "paper.pdf" */
  fileName: string;
  mime: string;
  sizeBytes: number;
}

class TooLarge extends Error {}

const skip = (file: FileRef, why: string) => {
  console.warn(`[crawl] bỏ qua tệp "${file.name}": ${why}`);
  return null;
};

/**
 * Tải nguyên bản một tệp đính kèm (không xử lý gì), ghi atomic: file tạm -> rename.
 * Tệp quá lớn hoặc tải lỗi thì bỏ qua (null, có log), không làm hỏng cả đề; chỉ lỗi đăng nhập mới ném ra để worker đăng nhập lại.
 * `budget.used` dùng chung cho cả đề (các lượt tải chạy song song).
 */
export async function downloadAttachment(
  client: FuoClient,
  file: FileRef,
  fileName: string,
  dir: string,
  budget: { used: number },
): Promise<DownloadedFile | null> {
  const type = attachmentType(fileName);
  if (!type) return skip(file, "loại tệp không được hỗ trợ");
  if (!isFuoHttpsUrl(file.url)) return skip(file, "không phải link FuOverflow");

  const target = path.join(dir, fileName);
  const tmp = `${target}.tmp`;
  let size = 0;
  try {
    const res = await client.fetchOk(file.url, { accept: "*/*" });
    if (!isFuoHttpsUrl(res.url || file.url)) {
      await res.body?.cancel();
      return skip(file, "bị chuyển hướng ra ngoài FuOverflow");
    }
    if ((res.headers.get("content-type") ?? "").startsWith("text/html")) throw new FuoAuthError(file.url); // trang đăng nhập
    if (Number(res.headers.get("content-length") ?? 0) > ATTACHMENT_MAX_BYTES || !res.body) {
      await res.body?.cancel();
      return skip(file, "quá lớn hoặc rỗng");
    }
    const guard = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        size += chunk.length;
        budget.used += chunk.length;
        cb(size > ATTACHMENT_MAX_BYTES || budget.used > ATTACHMENT_TOTAL_MAX_BYTES ? new TooLarge() : null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(res.body as unknown as NodeReadableStream), guard, createWriteStream(tmp));
    await fs.rename(tmp, target);
    return { file, fileName, mime: type.mime, sizeBytes: size };
  } catch (err) {
    budget.used -= size;
    await fs.rm(tmp, { force: true });
    if (err instanceof FuoAuthError) throw new Error(FUO_AUTH_MESSAGE, { cause: err });
    return skip(file, err instanceof TooLarge ? "vượt giới hạn dung lượng" : err instanceof Error ? err.message : String(err));
  }
}
