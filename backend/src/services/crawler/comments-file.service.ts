// comments.txt của một đề (exams/<threadId>/comments.txt, mỗi câu một mục "## Q<tên>", mỗi bình luận một dòng
// "[thời gian] tác giả [điểm uy tín] (#id): nội dung"): chỉ còn đọc tệp đã có để gửi cho AI.

/** Lấy phần bình luận của một câu ("Q7") từ bản đã rút gọn; null nếu câu đó không có bình luận. */
export function commentsOfQuestion(compact: string | null, name: string): string | null {
  if (!compact) return null;
  const section = compact.split(/^## /m).find((part) => part.split("\n", 1)[0]?.trim() === name);
  const body = section?.split("\n").slice(1).join("\n").trim();
  return body || null;
}

// Bình luận là chữ của người lạ trên diễn đàn: đổi thẻ dạng <tag> / </tag> thành ‹tag› để không đóng sớm khối <comments> hay giả khối khác trong prompt
export const defang = (text: string) => text.replace(/<(\/?[A-Za-z][^>]*)>/g, "‹$1›");

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
      current.comments.push(`${m[1]}${score}: ${defang(m[3] ?? "")}`);
      last = current.comments.length - 1;
    } else if (line.startsWith("    ") && last >= 0) {
      current.comments[last] += ` ${defang(line.trim())}`; // dòng tiếp theo của cùng một bình luận
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
