// Kỳ học suy ra từ tên đề: "SU26", "FA 2024" -> FA24, "Fall 2024" -> FA24, "Summer-2025" -> SU25.
// Ba kỳ mỗi năm: SP (xuân, đầu năm), SU (hè), FA (thu, cuối năm).
const NAMES: Record<string, string> = { SPRING: "SP", SUMMER: "SU", FALL: "FA", SP: "SP", SU: "SU", FA: "FA" };
const TERM = /(?<![A-Za-z0-9])(SPRING|SUMMER|FALL|SP|SU|FA)\s?-?\s?(?:20)?(\d{2})(?!\d)/i;

export const termOf = (title: string) => {
  const m = title.match(TERM);
  return m ? `${NAMES[m[1]!.toUpperCase()]}${m[2]}` : null;
};

// Kỳ mới hơn xếp trước: năm lớn hơn, cùng năm thì FA (cuối năm) > SU > SP
export const termRank = (t: string) => Number(t.slice(2)) * 10 + ({ FA: 3, SU: 2, SP: 1 }[t.slice(0, 2)] ?? 0);

// Chỉ số liên tục của kỳ để so sánh: năm (2 số) * 3 + thứ tự trong năm
const ORDER: Record<string, number> = { SP: 0, SU: 1, FA: 2 };

export function termIndex(term: string | null): number | null {
  const m = term?.match(/^(SP|SU|FA)(\d{2})$/);
  return m ? Number(m[2]) * 3 + ORDER[m[1]!]! : null;
}

// Kỳ hiện tại theo giờ Việt Nam: tháng 1-4 SP, 5-8 SU, 9-12 FA
export function currentTermIndex(now = new Date()): number {
  const vn = new Date(now.getTime() + 7 * 3_600_000);
  const month = vn.getUTCMonth() + 1;
  return (vn.getUTCFullYear() % 100) * 3 + (month <= 4 ? 0 : month <= 8 ? 1 : 2);
}

// "Gần đây" = kỳ hiện tại hoặc kỳ liền trước (đang là FA26 thì SU26 vẫn gần đây)
export function isRecentTerm(term: string | null, now = new Date()): boolean {
  const i = termIndex(term);
  return i !== null && i >= currentTermIndex(now) - 1;
}
