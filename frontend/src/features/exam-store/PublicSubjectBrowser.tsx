import { useMemo } from "react";
import { CompactSubjectPicker } from "@/features/subject/CompactSubjectPicker";
import { SubjectCard } from "@/features/subject/SubjectCard";
import { SubjectPicker } from "@/features/subject/SubjectPicker";
import { useUrlState } from "@/shared/hooks/useUrlState";
import type { CatalogSubject } from "./catalog.api";
import { featuredSubjects } from "./featuredSubjects";
import { PublicExamList } from "./PublicExamList";

const COMPACT_PAGE_SIZE = 6; // trang chủ: chỉ vài đề mỗi trang để không đẩy các phần bên dưới đi quá xa

export interface SubjectsQuery {
  data: CatalogSubject[] | null | undefined;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// Chọn môn rồi xem danh sách đề của môn đó, dành cho khách (Kho đề công khai và tab "Chọn đề" ở trang chủ).
// Môn đang chọn nằm trên địa chỉ trang (?subject=PRO192). Danh sách môn do nơi dùng tải, để dùng luôn cho số liệu tổng.
export function PublicSubjectBrowser({ subjects, compact = false }: { subjects: SubjectsQuery; compact?: boolean }) {
  const [url, setUrl] = useUrlState({ subject: "" });
  const code = url.subject.toUpperCase();
  const list = useMemo(() => subjects.data?.map((s) => ({ code: s.code, name: s.name, badge: `${s.total} đề` })), [subjects.data]);

  if (code)
    return (
      <SubjectCard title={`Môn ${code}`} onBack={() => setUrl({ subject: "" })}>
        <PublicExamList code={code} pageSize={compact ? COMPACT_PAGE_SIZE : undefined} />
      </SubjectCard>
    );
  if (compact)
    return (
      <CompactSubjectPicker
        subjects={list}
        loading={subjects.loading}
        error={subjects.error}
        onRetry={subjects.reload}
        onPick={(c) => setUrl({ subject: c })}
        quick={featuredSubjects(subjects.data)}
        allHref="/kho-de"
      />
    );
  return (
    <SubjectPicker
      subjects={list}
      loading={subjects.loading}
      error={subjects.error}
      onRetry={subjects.reload}
      onPick={(c) => setUrl({ subject: c })}
      emptyHint="Thử mã môn khác, hoặc dán link FuOverflow ở trang chủ để lấy đề mới."
    />
  );
}
