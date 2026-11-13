// Ba kỳ mỗi năm: SP (xuân), SU (hè), FA (thu). Đánh số liên tục để so sánh: năm * 3 + thứ tự trong năm.
const ORDER: Record<string, number> = { SP: 0, SU: 1, FA: 2 };

export function termIndex(term: string | null): number | null {
  const m = term?.match(/^(SP|SU|FA)(\d{2})$/);
  return m ? Number(m[2]) * 3 + ORDER[m[1]!]! : null;
}

// Kỳ hiện tại theo tháng: 1-4 SP, 5-8 SU, 9-12 FA (các tháng giáp ranh 1, 5, 9 tính vào kỳ vừa bắt đầu)
export function currentTermIndex(now = new Date()): number {
  const m = now.getMonth() + 1;
  return (now.getFullYear() % 100) * 3 + (m <= 4 ? 0 : m <= 8 ? 1 : 2);
}

// "Đề mới" = đề của kỳ hiện tại hoặc kỳ ngay trước đó (ví dụ đang là FA26 thì SU26 vẫn là đề mới)
export function isNewTerm(term: string | null, now = new Date()): boolean {
  const i = termIndex(term);
  return i !== null && i >= currentTermIndex(now) - 1;
}
