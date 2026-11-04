/**
 * Chuẩn hoá đáp án trong bình luận bằng code (quy tắc xác định, kiểm tra được), thay cho việc bắt model tự đoán:
 * "A", "a", "answer A", "đáp án: B", "A, C", "A C D", "ACD", "a. nội dung" đều quy về các chữ cái đáp án.
 * Cố ý CHẶT để tránh nhận nhầm: chỉ nhận khi bình luận bắt đầu bằng đáp án (hoặc "answer/đáp án ..."), sau đáp án
 * phải là hết câu hoặc dấu ngắt. Không nhận được thì bỏ qua, model vẫn đọc nguyên bình luận như trước.
 */
const LETTER = "[A-Ha-h]";
const SEP = String.raw`(?:\s*[,;&+/]\s*|\s+(?:and|và)\s+|\s+)`;
const ONE = String.raw`${LETTER}(?:${SEP}${LETTER})*`; // "A", "A, C", "A C D", "a and c"
const GLUED = "[A-H]{2,6}"; // "ACD" (chữ hoa liền nhau; chữ thường liền nhau thường là một từ, không nhận)
const PREFIX = String.raw`(?:(?:answer|ans|đáp án|dap an|key|chọn|choose)\s*(?:is|là|:|=|-)?\s*)?`;
const ANSWER = new RegExp(String.raw`^${PREFIX}(${GLUED}|${ONE})(?=$|\s*[.):\-–—!]|\s*$)`, "i");

/** Các chữ cái đáp án mà một bình luận nêu (đã sắp xếp, viết hoa), hoặc null nếu bình luận không phải dạng nêu đáp án. */
export function answersInComment(text: string): string[] | null {
  const t = text.trim().replace(/^["'“‘(\[]+/, "");
  const m = t.match(ANSWER);
  if (!m) return null;
  let raw = m[1]!;
  // "ACD" liền nhau chỉ hợp lệ khi viết hoa; chữ thường liền nhau ("ab", "cab") là từ thường
  if (/^[A-Ha-h]{2,6}$/.test(raw) && raw !== raw.toUpperCase()) return null;
  // Chỉ lấy chữ cái đứng riêng hoặc dính liền ("A", "A, C", "ACD"), không lấy chữ cái trong từ nối như "and"
  const tokens = raw.split(/\s*[,;&+/]\s*|\s+(?:and|và)\s+|\s+/i).filter(Boolean);
  const letters = [...new Set(tokens.flatMap((t) => (/^[A-Ha-h]$/.test(t) || /^[A-H]{2,6}$/.test(t) ? t.toUpperCase().split("") : [])))].sort();
  return letters.length ? letters : null;
}

/** Nội dung bình luận (phần sau "tác giả [điểm]: ") của bản đã rút gọn: mỗi dòng một bình luận. */
const bodyOf = (line: string) => line.slice(line.indexOf(": ") + 2);

/**
 * Bảng đếm đáp án của các bình luận một câu, ví dụ "A×4, C×1, A C×1 (6/9 bình luận nêu đáp án)".
 * Trả về null nếu không có bình luận nào nêu đáp án. Chỉ là thống kê tham khảo cho model, không phải bằng chứng riêng.
 */
export function tallyOfComments(commentsOfOneQuestion: string): string | null {
  const lines = commentsOfOneQuestion.split("\n").filter((l) => l.trim());
  const counts = new Map<string, number>();
  let parsed = 0;
  for (const line of lines) {
    const letters = answersInComment(bodyOf(line));
    if (!letters) continue;
    parsed++;
    const key = letters.join(" ");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (parsed === 0) return null;
  const parts = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, n]) => `${k}×${n}`);
  return `${parts.join(", ")} (${parsed}/${lines.length} comments state an answer)`;
}
