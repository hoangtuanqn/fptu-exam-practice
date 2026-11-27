// Tìm môn theo mã hoặc tên ngay trên máy, không phân biệt dấu: gõ "mang may tinh" vẫn ra "Mạng máy tính"
export const foldText = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase().trim();

export type Searchable = { code: string; name?: string | null };

// Bỏ dấu sẵn một lần cho cả danh sách, để mỗi phím gõ chỉ còn việc so chuỗi
export function buildSearchIndex<T extends Searchable>(items: readonly T[]) {
  return items.map((item) => ({ item, code: foldText(item.code), name: foldText(item.name ?? "") }));
}

// Từ khoá rỗng: mọi môn theo thứ tự gốc. Có từ khoá: môn có mã bắt đầu bằng từ khoá xếp trước, rồi mới tới môn có mã hoặc tên chứa từ khoá.
export function searchSubjects<T extends Searchable>(index: ReturnType<typeof buildSearchIndex<T>>, query: string): T[] {
  const term = foldText(query);
  if (!term) return index.map((e) => e.item);
  const starts: T[] = [];
  const contains: T[] = [];
  for (const { item, code, name } of index) {
    if (code.startsWith(term)) starts.push(item);
    else if (code.includes(term) || name.includes(term)) contains.push(item);
  }
  return [...starts, ...contains];
}
