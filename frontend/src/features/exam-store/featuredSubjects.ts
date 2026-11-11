import type { CatalogSubject } from "./catalog.api";

// Môn gợi ý để chọn nhanh: ưu tiên môn có nhiều đề dùng được ngay (đã có ảnh và đáp án), rồi đến môn nhiều đề. Chỉ lấy môn thật sự có đề sẵn.
export function featuredSubjects(subjects: CatalogSubject[] | null | undefined, count = 8): string[] {
  return (subjects ?? [])
    .filter((s) => s.ready > 0)
    .sort((a, b) => b.ready - a.ready || b.total - a.total || a.code.localeCompare(b.code))
    .slice(0, count)
    .map((s) => s.code);
}
