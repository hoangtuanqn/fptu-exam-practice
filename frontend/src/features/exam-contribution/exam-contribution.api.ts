import { BASE, http, sendForm } from "@/shared/api/client";
import { PAGE_SIZE } from "@/shared/api/pagination";

export type ContributionStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface MyContribution {
  id: string;
  subjectCode: string;
  title?: string | null;
  term?: string | null;
  imageCount: number;
  status: ContributionStatus;
  reviewNote?: string | null;
  createdAt: string;
}

export interface AdminContribution extends MyContribution {
  note?: string | null;
  reviewedAt?: string | null;
  user?: { id: string; email: string; fullName: string } | null;
}

export interface ContributionInput {
  subjectCode: string;
  title: string;
  term: string;
  note: string;
  images: File[];
}

export const contributionApi = {
  create: ({ subjectCode, title, term, note, images }: ContributionInput) => {
    const form = new FormData();
    form.append("subjectCode", subjectCode);
    if (title.trim()) form.append("title", title.trim());
    if (term.trim()) form.append("term", term.trim());
    if (note.trim()) form.append("note", note.trim());
    for (const f of images) form.append("images", f);
    return sendForm<{ id: string; status: ContributionStatus; imageCount: number }>("POST", "/exam-contributions", form);
  },
  mine: (page = 1) => http.list<MyContribution>("/exam-contributions/mine", { page, limit: PAGE_SIZE }),

  // ----- Admin
  list: (page: number, status: ContributionStatus | "", q = "") => http.list<AdminContribution>("/admin/exam-contributions", { page, limit: PAGE_SIZE, status, q }),
  // Ảnh thứ `n` (đếm từ 1). Cần token admin nên hiển thị qua ProtectedImg (fetch có header rồi blob), không dùng thẳng làm src
  imageUrl: (id: string, n: number) => `${BASE}/admin/exam-contributions/${encodeURIComponent(id)}/images/${n}`,
  approve: (id: string, note?: string) => http.post(`/admin/exam-contributions/${encodeURIComponent(id)}/approve`, { note }),
  reject: (id: string, note?: string) => http.post(`/admin/exam-contributions/${encodeURIComponent(id)}/reject`, { note }),
};
