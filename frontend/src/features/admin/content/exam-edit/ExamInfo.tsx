import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { adminApi, type ExamAdminDetail, type ExamPatch } from "@/features/admin/api/admin.api";
import { KIND_LABEL, type ExamKind } from "@/features/admin/exam-upload/exam-upload.api";
import { SubjectCombobox } from "@/features/subject/SubjectCombobox";
import { subjectApi } from "@/features/subject/subject.api";
import { ApiError } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import type { AnswerSource } from "@/shared/types/api";
import { Badge, type Tone } from "@/shared/ui/Badge";
import { Card } from "@/shared/ui/Card";
import { LinearProgress } from "@/shared/ui/Feedback";
import { Select } from "@/shared/ui/Input";
import { TitleEditor } from "./TitleEditor";

const SOURCE: Record<AnswerSource, [string, Tone]> = {
  PENDING: ["AI đang giải", "info"],
  FAILED: ["AI lỗi, chưa có đáp án", "danger"],
  DEFAULT: ["Chưa có đáp án", "danger"],
  AI: ["AI giải", "success"],
  MANUAL: ["Chỉnh tay", "info"],
};

// Khối "Thông tin đề": tên, loại đề, môn học (đổi là lưu ngay) và tình trạng đáp án
export function ExamInfo({ exam, answered, gradable, onSaved }: { exam: ExamAdminDetail; answered: number; gradable: number; onSaved: () => void }) {
  const toast = useToast();
  const subjects = useApi(() => subjectApi.subjects(), []);
  const [saving, setSaving] = useState(false);
  // Giá trị vừa chọn, hiện tạm tới khi tải lại xong chi tiết đề (exam đổi thì bỏ)
  const [pending, setPending] = useState<{ of: ExamAdminDetail; patch: ExamPatch } | null>(null);
  const [subjectError, setSubjectError] = useState<string>();
  const shown = pending?.of === exam ? pending.patch : {};
  const kind = shown.kind ?? exam.kind ?? "";
  const subjectCode = shown.subjectCode ?? exam.subjectCode ?? "";
  // Mã môn của đề không có trong danh sách môn thì ô chọn trông như trống, ghi rõ bên dưới
  const unknownCode = subjectCode && subjects.data && !subjects.data.some((s) => s.code === subjectCode) ? subjectCode : null;

  async function change(patch: ExamPatch, done: string, fail = "Không lưu được thông tin đề") {
    setPending({ of: exam, patch });
    setSubjectError(undefined);
    setSaving(true);
    try {
      await adminApi.updateExam(exam.id, patch);
      toast.success(done);
      onSaved();
      return true;
    } catch (err) {
      setPending(null);
      toast.error(errorMessage(err, fail));
      if (patch.subjectCode !== undefined && err instanceof ApiError) setSubjectError(err.errors?.subjectCode);
      return false;
    } finally {
      setSaving(false);
    }
  }

  const S = SOURCE[exam.answerSource];
  return (
    <Card className="mb-4 p-4 sm:p-5">
      <TitleEditor
        key={exam.title}
        title={exam.title}
        disabled={saving}
        // Đề đã có môn: gửi kèm để máy chủ không suy môn từ tên mới và ghi đè môn admin đã chọn. Chưa có môn: chỉ gửi tên để máy chủ tự suy như trước
        onSave={(title) => change(subjectCode ? { title, subjectCode } : { title }, "Đã đổi tên đề", "Không đổi được tên")}
      />
      <fieldset disabled={saving} className="mt-4 grid gap-3 sm:grid-cols-[11rem_1fr]">
        <Select label="Loại đề" value={kind} onChange={(e) => e.target.value !== kind && void change({ kind: e.target.value as ExamKind }, "Đã đổi loại đề")}>
          {!kind && (
            <option value="" disabled>
              Chưa rõ
            </option>
          )}
          {(Object.keys(KIND_LABEL) as ExamKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </Select>
        <div>
          <SubjectCombobox
            label="Môn học"
            subjects={subjects.error ? [] : (subjects.data ?? undefined)}
            value={subjectCode}
            error={subjectError}
            // Bấm X chỉ để tìm môn khác, không bỏ môn của đề
            onChange={(code) => code && code !== subjectCode && void change({ subjectCode: code }, "Đã đổi môn học")}
          />
          {unknownCode && <p className="md-body-small mt-1 px-4 text-on-surface-variant">{unknownCode} (chưa có trong danh sách môn)</p>}
        </div>
      </fieldset>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-on-surface-variant">
        <Badge tone={S[1]}>{S[0]}</Badge>
        <span>Thread {exam.threadId}</span>
        <span>{exam.questions.length} ảnh</span>
        <Link to={`/exam/${exam.id}`} className="inline-flex min-h-10 items-center gap-1 text-primary hover:underline">
          <BookOpen size={14} /> Mở làm thử
        </Link>
      </div>
      <div className="mt-2">
        <p className="mb-1 text-xs text-on-surface-variant">
          Có đáp án {answered}/{gradable}
        </p>
        <LinearProgress value={gradable ? answered / gradable : 0} label="Số câu đã có đáp án" />
      </div>
    </Card>
  );
}
