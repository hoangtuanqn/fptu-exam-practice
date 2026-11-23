import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { useApi } from "@/shared/hooks/useApi";
import { Footer } from "@/shared/layout/Footer";
import { SiteHeader } from "@/shared/layout/SiteHeader";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { Empty } from "@/shared/ui/Feedback";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { HeaderSearch } from "./HeaderSearch";
import { searchApi, type SearchResult } from "./search.api";

const NONE: SearchResult = { subjects: [], exams: [], flashcards: [] };

// Một nhóm kết quả: tiêu đề + danh sách liên kết (mỗi nhóm máy chủ trả tối đa 5 mục)
function Group({ title, rows }: { title: string; rows: { key: string; to: string; label: string; hint?: string }[] }) {
  if (rows.length === 0) return null;
  return (
    <Card>
      <CardHeader title={title} />
      <ul className="divide-y divide-outline-variant">
        {rows.map((r) => (
          <li key={r.key}>
            <Link to={r.to} className="md-state md-motion flex items-center justify-between gap-3 px-5 py-3 text-on-surface">
              <span className="md-body-medium min-w-0 truncate font-medium">{r.label}</span>
              {r.hint && <span className="md-body-small shrink-0 text-on-surface-variant">{r.hint}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// /search?q=...: kết quả tìm môn học, tên đề và flashcard (công khai, giống ô tìm trên header)
export default function SearchPage() {
  const q = useSearchParams()[0].get("q")?.trim() ?? "";
  const query = useApi(() => (q ? searchApi.query(q) : Promise.resolve(NONE)), [q]);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-6 sm:px-6">
        <div className="sm:hidden">
          <HeaderSearch wide />
        </div>
        <PageHeader title={q ? `Kết quả cho “${q}”` : "Tìm kiếm"} description="Môn học, tên đề thi và flashcard." />
        {!q ? (
          <Empty icon={Search} title="Nhập từ khoá để tìm">
            Ví dụ mã môn PRO192 hoặc một phần tên đề.
          </Empty>
        ) : (
          <QueryBoundary query={query}>
            {(data) =>
              data.subjects.length + data.exams.length + data.flashcards.length === 0 ? (
                <Empty icon={Search} title="Không có kết quả nào khớp">
                  Thử mã môn hoặc từ khoá ngắn hơn.
                </Empty>
              ) : (
                <div className="space-y-4">
                  <Group
                    title="Môn học"
                    rows={data.subjects.map((s) => ({ key: s.code, to: `/account/exams?tab=subject&subject=${encodeURIComponent(s.code)}`, label: s.name ? `${s.code} · ${s.name}` : s.code }))}
                  />
                  <Group
                    title="Đề thi"
                    rows={data.exams.map((e) => ({
                      key: e.examId,
                      to: `/exam/${e.examId}/preview`,
                      label: e.title,
                      hint: [e.subjectCode, e.questions != null ? `${e.questions} câu` : null].filter(Boolean).join(" · "),
                    }))}
                  />
                  <Group
                    title="Flashcard"
                    rows={data.flashcards.map((f) => ({ key: f.code, to: `/flashcard/${encodeURIComponent(f.code)}`, label: f.name ? `${f.code} · ${f.name}` : f.code, hint: `${f.cardCount} thẻ` }))}
                  />
                </div>
              )
            }
          </QueryBoundary>
        )}
      </main>
      <Footer />
    </div>
  );
}
