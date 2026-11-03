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
