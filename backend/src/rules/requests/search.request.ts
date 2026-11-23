import { z } from "zod";

// Ô tìm kiếm chung trên header: môn học, tên đề, tên flashcard
export const searchQuery = z.object({
  q: z.string().trim().min(1, "Nhập từ khoá cần tìm").max(60, "Từ khoá quá dài"),
});
export type SearchQuery = z.infer<typeof searchQuery>;
