import { useMemo } from "react";
import { BookOpen } from "lucide-react";
import { examOpenPath } from "@/features/exam/types";
import { useAuth } from "@/features/auth/AuthContext";
import { useApi } from "@/shared/hooks/useApi";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { Empty } from "@/shared/ui/Feedback";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { Pagination } from "@/shared/ui/Table";
import { formatCredit } from "@/shared/utils/formatters";
import { isPro } from "@/shared/utils/pro";
import { CompactSubjectPicker } from "@/features/subject/CompactSubjectPicker";
import { SubjectCard } from "@/features/subject/SubjectCard";
import { SubjectPicker } from "@/features/subject/SubjectPicker";
import { ExamRow } from "./ExamRow";
import { catalogApi, type CatalogItem } from "./catalog.api";
import { ExamFilterBar, useExamListQuery } from "./ExamFilterBar";
import { featuredSubjects } from "./featuredSubjects";

// Kho đề > Theo môn: các đề hệ thống đã có của một môn. Đề có phí chỉ trừ khi người dùng bấm và đồng ý.
export function SubjectBrowser({ compact = false }: { compact?: boolean }) {
  const [url, setUrl] = useUrlState({ subject: "" });
  const code = url.subject.toUpperCase();
  return code ? <ExamList code={code} onBack={() => setUrl({ subject: "" })} /> : <SubjectChooser compact={compact} onPick={(c) => setUrl({ subject: c })} />;
}

function SubjectChooser({ onPick, compact }: { onPick: (code: string) => void; compact: boolean }) {
  const { user } = useAuth();
  const subjects = useApi(() => catalogApi.subjects(), []);
  const mine = useApi(() => (user ? catalogApi.mySubjects() : Promise.resolve([] as string[])), [user?.id]);
  const list = useMemo(() => subjects.data?.map((s) => ({ code: s.code, name: s.name, badge: `${s.total} đề` })), [subjects.data]);
  if (compact) {
    // Trang chủ: môn của tôi trước, rồi các môn có sẵn đề; còn lại tìm bằng ô tìm kiếm
    const quick = [...new Set([...(mine.data ?? []), ...featuredSubjects(subjects.data)])].slice(0, 8);
    return <CompactSubjectPicker subjects={list} loading={subjects.loading} error={subjects.error} onRetry={subjects.reload} onPick={onPick} quick={quick} allHref="/kho-de" />;
  }
  return (
    <SubjectPicker
      subjects={list}
      loading={subjects.loading}
      error={subjects.error}
      onRetry={subjects.reload}
      onPick={onPick}
      mine={mine.data ?? []}
      emptyHint="Thử mã môn khác."
    />
  );
}

const priceOf = (d: { price: number; pePrice?: number }, e: CatalogItem) => (e.kind === "PE" ? (d.pePrice ?? d.price) : d.price);

// Đề đã có trong kho: vào làm; chưa có: vào /exam/:id, nơi xem thử vài câu đầu (hoặc trang khoá nếu không làm thử được), chỉ trừ credit khi bạn đồng ý mở khoá
const targetOf = (e: CatalogItem) => (e.status === "owned" ? examOpenPath({ id: e.examId!, kind: e.kind, totalQuestions: e.questions }) : `/exam/${e.examId}`);

function ExamList({ code, onBack }: { code: string; onBack: () => void }) {
  const { user } = useAuth();
  const query = useExamListQuery();
  const { url, setUrl, page } = query;
  const list = useApi(() => catalogApi.exams(code, { q: url.q, term: url.term, kind: url.kind, page }), [code, url.q, url.term, url.kind, page, user?.id]);

  return (
    <SubjectCard title={`Môn ${code}`} onBack={onBack}>
      <div className="space-y-3 border-b border-outline-variant px-5 py-4">
        <ExamFilterBar query={query} terms={list.data?.terms} loading={list.loading} />
      </div>

      <QueryBoundary query={list}>
        {(res) => {
          // Chỉ hiện đề đã có trong hệ thống (máy chủ cũ còn trả mục chưa có đề)
          const data = { ...res, items: res.items.filter((e) => !!e.examId) };
          return data.items.length === 0 ? (
            <Empty icon={BookOpen} title={data.total > 0 ? "Không có đề nào khớp" : "Chưa có đề nào của môn này"}>
              {data.total > 0 ? "Thử bỏ bộ lọc hoặc đổi từ khoá." : "Môn này chưa có đề, bạn quay lại sau nhé."}
            </Empty>
          ) : (
            <>
              <ul className="divide-y divide-outline-variant">
                {data.items.map((e) => {
                  const fee = e.status !== "owned" && !isPro(user) ? priceOf(data, e) : 0;
                  return <ExamRow key={e.examId} item={e} known to={targetOf(e)} hint={fee > 0 ? formatCredit(fee) : undefined} />;
                })}
              </ul>
              <Pagination meta={data.meta} onPage={(p) => setUrl({ page: String(p) })} />
            </>
          );
        }}
      </QueryBoundary>
    </SubjectCard>
  );
}
