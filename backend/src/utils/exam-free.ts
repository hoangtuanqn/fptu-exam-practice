// Quy tắc đề miễn phí của Thư viện đề thi. Thuần logic, không đụng cơ sở dữ liệu.
// Đề miễn phí khi: admin ghi đè = true; hoặc không ghi đè, quy tắc đang bật và kỳ thi của đề KHÔNG nằm trong các kỳ thi mới nhất.
// Không rõ kỳ thi thì tính phí (an toàn). Ghi đè = false luôn tính phí.
export interface FreeRule {
  enabled: boolean; // thư viện đang bật
  ruleEnabled: boolean;
  newestTerms: ReadonlySet<string>; // các kỳ thi mới nhất đang có trong hệ thống, vẫn tính phí
}

export const isExamFree = (exam: { freeOverride: boolean | null; term: string | null }, rule: FreeRule): boolean => {
  if (!rule.enabled) return false;
  if (exam.freeOverride !== null) return exam.freeOverride;
  if (!rule.ruleEnabled || !exam.term) return false;
  return !rule.newestTerms.has(exam.term);
};
