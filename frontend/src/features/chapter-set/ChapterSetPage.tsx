import { useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/shared/ui/Card";
import { AllSubjectsPicker } from "@/features/subject/AllSubjectsPicker";
import { SubjectCard } from "@/features/subject/SubjectCard";
import { subjectApi, type SubjectItem } from "@/features/subject/subject.api";
import { ChapterStep } from "./ChapterStep";
import { ExamPickStep } from "./ExamPickStep";
import type { PickedExam } from "./types";

// Bộ đề theo chương: chọn môn -> chọn nhiều đề (từ kho của tôi và/hoặc link FuOverflow) -> chọn chương -> làm lần lượt từng đề, chỉ các câu thuộc chương đã chọn.
export default function ChapterSetPage() {
  const [subject, setSubject] = useState<SubjectItem | null>(null);
  const [exams, setExams] = useState<PickedExam[]>([]);
  const [step, setStep] = useState<"pick" | "chapters">("pick");
  const [blocked, setBlocked] = useState<{ subject: SubjectItem; message: string } | null>(null); // môn chưa có tên chương trong syllabus
  const [checking, setChecking] = useState(false);

  // Môn thiếu tên chương thì dừng ngay ở đây (máy chủ đồng thời gửi báo cáo cho admin). Không kiểm tra được thì cứ đi tiếp: máy chủ vẫn chặn trước khi trừ phí.
  const pick = async (s: SubjectItem) => {
    setChecking(true);
    try {
      const r = await subjectApi.chapterSetCheck(s.code);
      if (r.ok) choose(s);
      else setBlocked({ subject: s, message: r.message ?? "Môn này chưa làm được bộ đề theo chương." });
    } catch {
      choose(s);
    } finally {
      setChecking(false);
    }
  };

  // Đổi môn thì bỏ danh sách đề đã chọn của môn trước
  const choose = (s: SubjectItem) => {
    setExams([]);
    setStep("pick");
    setSubject(s);
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Học tập" title="Bộ đề theo chương" description="Chọn môn và một hoặc nhiều đề FE, rồi chỉ luyện các câu thuộc chương bạn đang muốn ôn." />
      {blocked ? (
        <SubjectCard title={`Môn ${blocked.subject.code} chưa làm được bộ đề theo chương`} backLabel="Chọn môn khác" onBack={() => setBlocked(null)}>
          <div role="alert" className="flex items-start gap-3 p-5">
            <TriangleAlert size={20} className="mt-0.5 shrink-0 text-error" />
            <p className="md-body-medium text-on-surface">
              <b>{blocked.subject.code}</b> · {blocked.subject.name}. {blocked.message}
            </p>
          </div>
        </SubjectCard>
      ) : !subject ? (
        <>
          <AllSubjectsPicker title="Bước 1: chọn môn" onPick={(s) => void pick(s)} />
          {checking && (
            <p role="status" className="flex items-center gap-2 text-sm text-on-surface-variant">
              <Loader2 size={16} className="animate-spin" /> Đang kiểm tra syllabus của môn…
            </p>
          )}
        </>
      ) : step === "pick" ? (
        <ExamPickStep subject={subject} picked={exams} onChange={setExams} onNext={() => setStep("chapters")} onBack={() => setSubject(null)} />
      ) : (
        <ChapterStep subject={subject} exams={exams} onBack={() => setStep("pick")} />
      )}
    </div>
  );
}
