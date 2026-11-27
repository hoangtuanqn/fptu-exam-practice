import {
  COMMENT_BLOCKED_WORDS,
  COMMENT_CONTACT_WORDS,
  COMMENT_HELD_WORDS,
  COMMENT_LINK_ALLOWED,
  COMMENT_LINK_TLDS,
} from "../constants/comment-words";
import { EXAM_COMMENT_REPEAT_CHAR_MAX, type CommentFlagReason } from "../constants/exam-comment";

// Lọc nội dung bình luận (decision 0019). Chỉ dùng bản chuẩn hoá để SO KHỚP, nội dung lưu giữ nguyên.
// Từ có dấu so có dấu (không bỏ dấu: "cặc" khác "các", "lồn" khác "lon", "buồi" khác "buổi"), chỉ khớp nguyên từ.

const INVISIBLE = /[­͏᠎​-‏⁠-⁤﻿]/g;
const WORD = /[\p{L}\p{M}\p{N}]+/gu;
// Dấu chèn giữa hai chữ cái để lách: "đ.m", "d_c_m", "f*ck"
const INNER_SEP = /(?<=[\p{L}\p{M}])[._\-*'`~|]+(?=[\p{L}\p{M}])/gu;
// Các chữ cái đơn đứng cách nhau: "v c l" -> "vcl"
const SINGLE_RUN = /(?<![\p{L}\p{M}\p{N}])\p{L}\p{M}*(?:[ ._\-*]+\p{L}\p{M}*(?![\p{L}\p{M}\p{N}]))+/gu;

const normalize = (s: string) => s.normalize("NFC").toLowerCase().replace(INVISIBLE, "");
const words = (s: string) => s.match(WORD) ?? [];
const collapse = (w: string) => w.replace(/(.)\1+/gu, "$1");
const hasRun3 = (w: string) => /(.)\1\1/u.test(w);

type Entry = { raw: string; collapsed: string }[];
const compile = (list: readonly string[]): Entry[] => list.map((e) => e.split(" ").map((raw) => ({ raw, collapsed: collapse(raw) })));

// Chữ lặp để lách ("đmmmm", "fuuuck") vẫn khớp; chữ đôi hợp lệ chỉ được gộp khi có ít nhất 3 chữ lặp liền
const tokenMatches = (t: string, e: { raw: string; collapsed: string }) =>
  t === e.raw || collapse(t) === e.raw || (hasRun3(t) && collapse(t) === e.collapsed);

const hasEntry = (tokens: readonly string[], entries: readonly Entry[]) =>
  tokens.some((_, i) => entries.some((entry) => i + entry.length <= tokens.length && entry.every((e, j) => tokenMatches(tokens[i + j]!, e))));

const BLOCKED = compile(COMMENT_BLOCKED_WORDS);
const HELD = compile(COMMENT_HELD_WORDS);
const CONTACT = compile(COMMENT_CONTACT_WORDS);

const CONTACT_PATTERNS = [
  /(?<![\p{L}\p{N}])t\.me(?![\p{L}\p{N}])/u,
  /(?<![\p{L}\p{N}])(?:facebook|fb)\.com/u,
  /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/u, // email
  // Số di động Việt Nam (0 hoặc +84, đầu 3/5/7/8/9, viết liền hoặc cách bằng dấu cách/chấm/gạch); không ăn vào số kế toán như 350.000.000
  /(?<![\d.,])(?:\+84|0)[ .-]?[35789](?:[ .-]?\d){8}(?!\d)/,
  /(?<![\d.,+])84[35789]\d{8}(?!\d)/,
];

const ALLOWED_DOTTED = new RegExp(COMMENT_LINK_ALLOWED.map((n) => n.replace(".", "\\.")).join("|"), "g");
const LINK_PATTERNS = [
  /https?:\/\//,
  /(?<![\p{L}\p{N}])www\./u,
  // tên miền: abc.com, abc.com.vn; không tính obj.top() hay namespace.io.File
  new RegExp(`(?<![\\p{L}\\p{N}])[\\p{L}\\p{N}][\\p{L}\\p{N}-]*\\.(?:${COMMENT_LINK_TLDS.join("|")})(?![\\p{L}\\p{N}_(]|\\.[\\p{L}\\p{N}])`, "u"),
];

// Liên kết viết bằng Markdown ra ngoài trang: [chữ](//ten-mien), [chữ](scheme:...), định nghĩa tham chiếu, <scheme:...> (không ăn vào <std::string>)
const MARKDOWN_LINKS = [
  /\]\(\s*<?\s*(?:[\\/]{2}|[a-z][a-z0-9+.-]*:)/,
  /^\s{0,3}\[[^\]\n]+\]:\s*<?\s*(?:[\\/]{2}|[a-z][a-z0-9+.-]*:)/m,
  /<[a-z][a-z0-9+.-]+:(?!:)[^\s>]*>/,
];
// Mã ký tự (&#100; &uacute;) hiện thành chữ khi vẽ Markdown nên qua mặt được danh sách từ: để admin xem
const ENTITY = /&(?:#\d+|#x[0-9a-f]+|[a-z]+\d*);/;

const REPEATED_CHAR = new RegExp(`(\\S)\\1{${EXAM_COMMENT_REPEAT_CHAR_MAX},}`, "u");

/**
 * Kết quả lọc một bình luận đã làm sạch: "BLOCKED" = từ chối không lưu, một lý do = lưu và chờ duyệt, null = hiện ngay.
 * Không bao giờ trả ra từ nào bị khớp (để khó lách).
 */
export function moderateComment(body: string): "BLOCKED" | Extract<CommentFlagReason, "WORDS" | "CONTACT" | "LINK" | "REPEATED"> | null {
  const text = normalize(body);
  const joined = text.replace(INNER_SEP, "");
  const variants = [words(text), words(joined), words(joined.replace(SINGLE_RUN, (run) => run.replace(/[ ._\-*]+/g, "")))];

  if (variants.some((t) => hasEntry(t, BLOCKED))) return "BLOCKED";
  if (variants.some((t) => hasEntry(t, HELD)) || ENTITY.test(text)) return "WORDS";
  if (variants.some((t) => hasEntry(t, CONTACT)) || CONTACT_PATTERNS.some((p) => p.test(text))) return "CONTACT";
  const unescaped = text.replace(/\\(?=[:/.()[\]])/g, "");
  if (LINK_PATTERNS.some((p) => p.test(text.replace(ALLOWED_DOTTED, " "))) || MARKDOWN_LINKS.some((p) => p.test(unescaped))) return "LINK";
  if (REPEATED_CHAR.test(text)) return "REPEATED";
  return null;
}

// Chữ đáp án in hoa ở đầu ("A", "A, C", "A C", "A và C"), có thể sau "Đáp án" / "ĐA" / "Chọn"; chữ dính liền như "FE", "DB" là từ thường nên không tính.
// Theo sau là hết câu, dấu câu, " - " hoặc một từ khẳng định (vì/do/là/đúng/chắc/chuẩn/nha/nhé...); "A sai" không khớp
const LEAD = String.raw`(?:(?:[đĐ]áp\s+án|ĐA|[đĐ]a|[cC]họn)\s*[:.]?\s*)?`;
const SEP = String.raw`(?:\s*[,/&]\s*|\s+(?:và|hoặc)\s+|\s+)`;
const AFTER = String.raw`(?=\s*$|\s*[.,!?;:)…]|\s+-|\s+(?:[vV]ì|[dD]o|[lL]à|[đĐ]úng|[cC]hắc|[cC]huẩn|[tT]hì|[mM]ới|[nN]ha|[nN]hé|[oO]k)(?![\p{L}\p{M}]))`;
const ANSWER_PREFIX = new RegExp(`^${LEAD}([A-H](?:${SEP}[A-H])*)${AFTER}`, "u");

/**
 * Bình luận mở đầu bằng chữ đáp án thì trả các chữ đó (đã sắp xếp), không thì null.
 * "Bài này khó", "a lê", "BẠN ơi" không khớp; lặp chữ ("A A") coi là không rõ nên bỏ qua.
 */
export function answerLettersOf(body: string): string[] | null {
  const m = ANSWER_PREFIX.exec(body.normalize("NFC"));
  if (!m) return null;
  const letters = m[1]!.match(/[A-H]/g)!;
  return new Set(letters).size === letters.length ? letters.sort() : null;
}
