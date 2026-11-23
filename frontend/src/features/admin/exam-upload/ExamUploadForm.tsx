import { useEffect, useState, type FormEvent } from "react";
import { Upload } from "lucide-react";
import { useApi } from "@/shared/hooks/useApi";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { Button } from "@/shared/ui/Button";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { FormError, LinearProgress } from "@/shared/ui/Feedback";
import { Input, Select } from "@/shared/ui/Input";
import { SubjectCombobox } from "@/features/subject/SubjectCombobox";
import { subjectApi } from "@/features/subject/subject.api";
import { MAX_TOTAL_BYTES } from "@/features/exam-contribution/limits";
import { examUploadApi, KIND_LABEL, type ExamKind, type UploadJob } from "./exam-upload.api";
import { ansPathOf, checkFolder, findRoot, type FolderCheck, type FolderEntry } from "./folder";
import { FolderPicker } from "./FolderPicker";
import { FolderPreview } from "./FolderPreview";

export type UploadTarget =
  | { mode: "create"; title?: string; subjectCode?: string | null; kind?: ExamKind | null }
  | { mode: "update"; examId: string; title: string; questions: number };

const KINDS = Object.keys(KIND_LABEL) as ExamKind[];
const FIELDS = ["title", "subjectCode", "kind", "images", "answers"];

// Tải đề từ một thư mục (images/Qn.webp + ans.json): tạo đề mới, hoặc bổ sung/thay ảnh cho đề đã có
interface Props {
  target: UploadTarget;
  onDone: (job: UploadJob) => void; // máy chủ đã nhận đề, xử lý tiếp chạy nền
  onBusy?: (busy: boolean) => void;
  onCancel?: () => void; // có thì hiện nút Huỷ (dùng trong hộp thoại)
}

export function ExamUploadForm({ target, onDone, onBusy, onCancel }: Props) {
  const create = target.mode === "create";
  const subjects = useApi(() => (create ? subjectApi.subjects() : Promise.resolve(null)), [create]);
  const submit = useSubmit("Chưa tải được đề lên, bạn thử lại nhé", FIELDS);
  const { confirm, confirmDialog } = useConfirm();
  const [title, setTitle] = useState(create ? (target.title ?? "") : "");
  const [subjectCode, setSubjectCode] = useState(create ? (target.subjectCode ?? "") : "");
  const [kind, setKind] = useState<ExamKind>(create && target.kind ? target.kind : "FE");
  const [folder, setFolder] = useState<{ check: FolderCheck<File>; ansJson: string | null } | null>(null);
  const [missing, setMissing] = useState<{ title?: string; subjectCode?: string; folder?: string }>({});
  const busy = submit.loading;
  useEffect(() => {
    onBusy?.(busy);
  }, [busy, onBusy]);

  const pick = async (entries: FolderEntry<File>[]) => {
    submit.clear();
    setMissing((m) => ({ ...m, folder: undefined }));
    const { root } = findRoot(entries.map((e) => e.path));
    const ans = root === null ? undefined : entries.find((e) => e.path === ansPathOf(root));
    let ansJson: string | null = null;
    try {
      ansJson = ans ? await ans.file.text() : null;
    } catch {
      setMissing((m) => ({ ...m, folder: "Không đọc được ans.json." }));
      return;
    }
    setFolder({ check: checkFolder(entries, ansJson, create ? undefined : target.questions), ansJson });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const check = folder?.check;
    const total = check?.items.reduce((s, i) => s + i.file.size, 0) ?? 0;
    const next = {
      title: create && !title.trim() ? "Nhập tên đề" : undefined,
      subjectCode: create && !subjectCode ? "Chọn môn của đề" : undefined,
      folder: !check ? "Chọn thư mục đề" : total > MAX_TOTAL_BYTES ? "Tổng dung lượng ảnh quá lớn. Hãy chia thành nhiều lần tải." : undefined,
    };
    setMissing(next);
    if (next.title || next.subjectCode || next.folder || !folder || !check || check.errors.length) return;
    if (!create && check.replaced.length) {
      const ok = await confirm({
        title: `Thay ảnh ${check.replaced.length} câu?`,
        message: <>Ảnh mới sẽ thay ảnh cũ của câu {check.replaced.length > 12 ? `${check.replaced.slice(0, 12).join(", ")}…` : check.replaced.join(", ")}. Ảnh cũ không khôi phục được.</>,
        confirmLabel: "Thay ảnh",
        tone: "danger",
      });
      if (!ok) return;
    }
    const input = { images: check.items.map((i) => i.file), ansJson: folder.ansJson };
    void submit.run(async () => {
      const r = create
        ? await examUploadApi.create({ ...input, title, subjectCode, kind })
        : await examUploadApi.addImages(target.examId, input);
      onDone(r);
    });
  };

  const check = folder?.check;
  const blocked = !!check?.errors.length;
  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
      {confirmDialog}
      {create ? (
        <>
          <Input label="Tên đề" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} disabled={busy} error={missing.title ?? submit.fieldErrors.title} />
          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <SubjectCombobox
              label="Môn học"
              subjects={subjects.error ? [] : (subjects.data ?? undefined)}
              value={subjectCode}
              onChange={(v) => {
                setSubjectCode(v);
                setMissing((m) => ({ ...m, subjectCode: undefined }));
              }}
              error={missing.subjectCode ?? submit.fieldErrors.subjectCode ?? (subjects.error ? "Chưa tải được danh sách môn" : undefined)}
            />
            <Select label="Loại đề" value={kind} onChange={(e) => setKind(e.target.value as ExamKind)} disabled={busy} error={submit.fieldErrors.kind}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </Select>
          </div>
        </>
      ) : (
        <p className="md-body-medium text-on-surface-variant">
          Đề <b className="text-on-surface">{target.title}</b> đang có {target.questions} câu. Ảnh có số câu đã có (Q1…Q{target.questions}) sẽ thay ảnh cũ của câu đó; câu mới phải nối tiếp từ Q{target.questions + 1}. Đáp án trong ans.json được cập nhật theo số câu.
        </p>
      )}

      <FolderPicker onPick={(entries) => void pick(entries)} disabled={busy} error={missing.folder ?? submit.fieldErrors.images ?? submit.fieldErrors.answers} />

      {check && (
        <>
          {check.root !== null && check.root !== "" && <p className="md-body-small break-words text-on-surface-variant">Thư mục đề: {check.root}</p>}
          {check.errors.length > 0 && (
            <ul role="alert" className="md-body-medium list-disc space-y-1 break-words rounded-m3-sm bg-error-container py-3 pl-8 pr-4 text-on-error-container">
              {check.errors.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
          {check.warnings.length > 0 && (
            <ul className="md-body-medium list-disc space-y-1 break-words rounded-m3-sm bg-warning-container py-3 pl-8 pr-4 text-on-warning-container">
              {check.warnings.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
          {check.items.length > 0 && <FolderPreview items={check.items} replaced={check.replaced} />}
        </>
      )}

      {busy && (
        <div className="space-y-1.5">
          <p className="md-body-small text-on-surface-variant">Đang tải {check?.items.length ?? 0} ảnh lên, đừng đóng trang nhé…</p>
          <LinearProgress label="Đang tải ảnh lên" />
        </div>
      )}
      <FormError message={submit.error} />
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <Button type="button" onClick={onCancel} disabled={busy}>
            Huỷ
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={busy || blocked || submit.retryIn > 0}>
          <Upload size={16} aria-hidden /> {busy ? "Đang tải lên…" : submit.retryIn > 0 ? `Thử lại sau ${submit.retryIn} giây` : create ? "Tạo đề" : "Tải ảnh lên"}
        </Button>
      </div>
    </form>
  );
}
