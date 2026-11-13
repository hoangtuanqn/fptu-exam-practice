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
