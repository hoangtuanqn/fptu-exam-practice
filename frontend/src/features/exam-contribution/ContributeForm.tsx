import { useState, type FormEvent } from "react";
import { CheckCircle2, Upload } from "lucide-react";
import { useApi } from "@/shared/hooks/useApi";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { FormError, LinearProgress } from "@/shared/ui/Feedback";
import { Field, Input, inputClass } from "@/shared/ui/Input";
import { SubjectCombobox } from "@/features/subject/SubjectCombobox";
import { subjectApi } from "@/features/subject/subject.api";
import { contributionApi } from "./exam-contribution.api";
import { MAX_TOTAL_BYTES } from "./limits";
import { ImagePicker } from "./ImagePicker";

const EMPTY = { subjectCode: "", title: "", term: "", note: "" };

// Form gửi ảnh đề: chọn môn, thông tin thêm (tuỳ chọn) và ảnh. Gửi xong hiện lời báo chờ duyệt.
export function ContributeForm({ onSent }: { onSent: () => void }) {
  const subjects = useApi(() => subjectApi.subjects(), []);
  const submit = useSubmit("Chưa gửi được đề, bạn thử lại nhé", ["subjectCode", "images"]);
  const [form, setForm] = useState(EMPTY);
  const [images, setImages] = useState<File[]>([]);
  const [errors, setErrors] = useState<{ subjectCode?: string; images?: string }>({});
  const [sent, setSent] = useState<number | null>(null);
  const set = (k: keyof typeof EMPTY) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const total = images.reduce((s, f) => s + f.size, 0);
    const next = {
      subjectCode: form.subjectCode ? undefined : "Chọn môn của đề",
      images: images.length === 0 ? "Chọn ít nhất một ảnh đề" : total > MAX_TOTAL_BYTES ? "Tổng dung lượng ảnh quá lớn. Hãy chia thành nhiều lần gửi." : undefined,
    };
    setErrors(next);
    if (next.subjectCode || next.images) return;
    void submit.run(async () => {
      const r = await contributionApi.create({ ...form, images });
      setSent(r?.imageCount ?? images.length);
      setForm(EMPTY);
      setImages([]);
      onSent();
    });
  };

  if (sent !== null) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
          <CheckCircle2 size={40} className="text-primary" aria-hidden />
          <h2 className="md-title-large text-on-surface">Đã gửi {sent} ảnh, cảm ơn bạn</h2>
          <p className="md-body-medium max-w-md text-on-surface-variant">Đề đang chờ admin duyệt. Bạn theo dõi trạng thái ở mục “Đóng góp của tôi” bên dưới.</p>
          <Button onClick={() => setSent(null)}>Gửi đề khác</Button>
        </div>
      </Card>
    );
  }

  const busy = submit.loading;
  return (
    <Card>
      <CardHeader title="Gửi ảnh đề thi" description="Miễn phí, không cần đáp án. Đề sẽ chờ admin duyệt." />
      <form onSubmit={onSubmit} className="space-y-4 p-5" noValidate>
        <SubjectCombobox
          label="Môn học"
          subjects={subjects.error ? [] : (subjects.data ?? undefined)}
          value={form.subjectCode}
          onChange={(v) => {
            set("subjectCode")(v);
            setErrors((x) => ({ ...x, subjectCode: undefined }));
          }}
          error={errors.subjectCode ?? submit.fieldErrors.subjectCode ?? (subjects.error ? "Chưa tải được danh sách môn" : undefined)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Tiêu đề (tuỳ chọn)" value={form.title} onChange={(e) => set("title")(e.target.value)} maxLength={200} disabled={busy} error={submit.fieldErrors.title} />
          <Input label="Kỳ thi (tuỳ chọn)" placeholder="Ví dụ: FA25, FE lần 1" value={form.term} onChange={(e) => set("term")(e.target.value)} maxLength={50} disabled={busy} error={submit.fieldErrors.term} />
        </div>
        <Field label="Ghi chú (tuỳ chọn)" error={submit.fieldErrors.note}>
          <textarea value={form.note} onChange={(e) => set("note")(e.target.value)} maxLength={500} disabled={busy} className={`${inputClass(submit.fieldErrors.note)} min-h-24 py-3`} />
        </Field>
        <ImagePicker
          files={images}
          disabled={busy}
          onChange={(f) => {
            setImages(f);
            setErrors((x) => ({ ...x, images: undefined }));
          }}
          error={errors.images ?? submit.fieldErrors.images}
        />
        {busy && (
          <div className="space-y-1.5">
            <p className="md-body-small text-on-surface-variant">Đang tải {images.length} ảnh lên, đừng đóng trang nhé…</p>
            <LinearProgress label="Đang tải ảnh lên" />
          </div>
        )}
        <FormError message={submit.error} />
        <Button type="submit" variant="primary" disabled={busy}>
          <Upload size={16} aria-hidden /> {busy ? "Đang gửi…" : "Gửi đề"}
        </Button>
      </form>
    </Card>
  );
}
