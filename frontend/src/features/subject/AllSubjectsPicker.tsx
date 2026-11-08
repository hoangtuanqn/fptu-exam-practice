import { useMemo } from "react";
import { chapterSetApi } from "@/features/chapter-set/chapter-set.api";
import { useApi } from "@/shared/hooks/useApi";
import { SubjectPicker } from "./SubjectPicker";

// Chọn trong toàn bộ môn của hệ thống (syllabus): dùng cho Bộ đề theo chương và Câu hay ra
export function AllSubjectsPicker({ title, onPick }: { title?: string; onPick: (subject: { code: string; name: string }) => void }) {
  const subjects = useApi(() => chapterSetApi.subjects(), []);
  const list = useMemo(() => subjects.data?.map((s) => ({ code: s.code, name: s.name })), [subjects.data]);
  return <SubjectPicker title={title} subjects={list} loading={subjects.loading} error={subjects.error} onRetry={subjects.reload} onPick={(code, s) => onPick({ code, name: s.name ?? "" })} emptyHint="Thử mã môn khác." />;
}
