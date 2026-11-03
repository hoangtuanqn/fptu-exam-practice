import fs from "node:fs/promises";
import path from "node:path";
import type { QuestionComments } from "./types";

const LINE = "-".repeat(70);

/** "2026-05-04T11:31:15+0700" -> "2026-05-04 11:31 (+0700)" */
function formatTime(iso: string): string {
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?(.*)$/);
  return m ? `${m[1]} ${m[2]}${m[3] ? ` (${m[3]})` : ""}` : iso;
}

/**
 * Dựng nội dung comments.txt (cùng định dạng với crawl-fu): mỗi câu một mục "## Q<tên>", mỗi bình luận một dòng
 * "[thời gian] tác giả [điểm uy tín] (#id): nội dung". Số trong ngoặc vuông là điểm uy tín của người viết trên
 * diễn đàn, KHÔNG phải điểm đúng/sai của đáp án.
 */
export function renderCommentsText(meta: { title: string; url: string; at: Date }, data: QuestionComments[]): string {
  const out: string[] = [meta.title, meta.url, `Crawl lúc: ${meta.at.toISOString()}`, "=".repeat(70), ""];

  for (const { image, comments } of data) {
    out.push(`## ${image.name}  (${comments.length} bình luận)`);
    if (image.mediaUrl) out.push(image.mediaUrl);
    out.push(LINE);
    if (comments.length === 0) out.push("(chưa có bình luận)");
    for (const c of comments) {
      const score = c.authorScore ? ` [${c.authorScore}]` : "";
      const [first, ...rest] = c.text.split("\n");
      out.push(`[${formatTime(c.time)}] ${c.author}${score} (#${c.id}): ${first ?? ""}`);
      for (const line of rest) out.push(`    ${line}`); // dòng tiếp theo thụt 4 dấu cách
    }
    out.push("");
  }
  return out.join("\n");
}

// Ghi comments.txt vào thư mục đề (cạnh thư mục images) và trả về nội dung để gửi cho AI
export async function writeCommentsFile(dir: string, meta: { title: string; url: string }, data: QuestionComments[]): Promise<string> {
  const text = renderCommentsText({ ...meta, at: new Date() }, data);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "comments.txt"), text, "utf-8");
  return text;
}

/** Lấy phần bình luận của một câu ("Q7") từ bản đã rút gọn; null nếu câu đó không có bình luận. */
export function commentsOfQuestion(compact: string | null, name: string): string | null {
  if (!compact) return null;
  const section = compact.split(/^## /m).find((part) => part.split("\n", 1)[0]?.trim() === name);
  const body = section?.split("\n").slice(1).join("\n").trim();
  return body || null;
}

// "[time] author [score] (#id): text" -> author, score, text (dòng đầu của một bình luận)
const COMMENT_LINE = /^\[[^\]]*\] (.*?)(?: (\[-?\d+\]))? \(#\d+\): ?(.*)$/;

/**
 * Bản gọn của comments.txt để gửi cho AI (tiết kiệm token): bỏ phần đầu tệp, giờ đăng, mã bình luận, đường dẫn
 * ảnh, câu chưa có bình luận, bình luận không có chữ hay số. Giữ tên tác giả, điểm uy tín và nội dung.
 * Trả về null nếu không còn bình luận nào. Tệp comments.txt gốc trên đĩa không bị đổi.
 */
export function compactCommentsText(raw: string): string | null {
  const sections: { name: string; comments: string[] }[] = [];
  let current: { name: string; comments: string[] } | null = null;
  let last = -1; // vị trí bình luận đang đọc dở trong mục hiện tại, để nối các dòng tiếp theo

  for (const line of raw.split(/\r?\n/)) {
    const head = line.match(/^## (\S+)/);
    if (head) {
      current = { name: head[1]!, comments: [] };
      sections.push(current);
      last = -1;
      continue;
    }
    if (!current) continue;
    const m = line.match(COMMENT_LINE);
    if (m) {
      const score = m[2] ? ` ${m[2]}` : "";
      current.comments.push(`${m[1]}${score}: ${m[3] ?? ""}`);
      last = current.comments.length - 1;
    } else if (line.startsWith("    ") && last >= 0) {
      current.comments[last] += ` ${line.trim()}`; // dòng tiếp theo của cùng một bình luận
    }
  }

  const out: string[] = [];
  for (const s of sections) {
    // Giữ cả bình luận trùng nhau: số người cùng một đáp án chính là bằng chứng
    const kept = s.comments.filter((c) => /[\p{L}\p{N}]/u.test(c.slice(c.indexOf(": ") + 2)));
    if (kept.length) out.push(`## ${s.name}`, ...kept, "");
  }
  return out.length ? out.join("\n").trim() : null;
}
