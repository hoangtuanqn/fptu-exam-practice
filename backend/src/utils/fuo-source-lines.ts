import { FUO_SOURCE_INVALID_LINE, FUO_SOURCE_URL_MAX } from "../constants/fuo-source";
import { isFuoThreadUrl, parseThreadId } from "./fuo-url";

export interface SourceLine {
  line: number; // số dòng trong khối văn bản (từ 1)
  threadId: string;
  url: string;
}

/**
 * Tách khối văn bản admin dán vào (mỗi dòng một link): bỏ khoảng trắng và dòng trống, kiểm từng link bằng đúng bộ đọc
 * link của ô lấy đề (isFuoThreadUrl + parseThreadId), gộp các link trùng thread (giữ dòng đầu tiên).
 */
export function parseSourceLines(text: string) {
  const accepted: SourceLine[] = [];
  const rejected: { line: number; text: string; reason: string }[] = [];
  const duplicates: { line: number; sameAs: number }[] = [];
  const firstLine = new Map<string, number>();

  text.split(/\r?\n/).forEach((raw, i) => {
    const url = raw.trim();
    const line = i + 1;
    if (!url) return;
    const threadId = url.length <= FUO_SOURCE_URL_MAX && isFuoThreadUrl(url) ? parseThreadId(url) : null;
    if (!threadId) return void rejected.push({ line, text: url.slice(0, FUO_SOURCE_URL_MAX), reason: FUO_SOURCE_INVALID_LINE });
    const sameAs = firstLine.get(threadId);
    if (sameAs !== undefined) return void duplicates.push({ line, sameAs });
    firstLine.set(threadId, line);
    accepted.push({ line, threadId, url });
  });
  return { accepted, rejected, duplicates };
}
