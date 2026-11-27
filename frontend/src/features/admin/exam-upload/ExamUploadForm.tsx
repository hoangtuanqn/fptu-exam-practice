import { useEffect, useRef, useState, type FormEvent } from "react";
import { Upload } from "lucide-react";
import { ApiError } from "@/shared/api/client";
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
import { ansPathOf, checkFolder, checkResources, findRoot, isQuizFolder, kindFromTitle, nameFromFolder, type FolderCheck, type FolderEntry, type ResourceCheck } from "./folder";
import { BatchUpload, groupByFolder } from "./BatchUpload";
import { FolderPicker } from "./FolderPicker";
import { FolderPreview } from "./FolderPreview";
import { ResourcePreview } from "./ResourcePreview";

export type UploadTarget =
  | { mode: "create"; title?: string; subjectCode?: string | null; kind?: ExamKind | null }
  | { mode: "update"; examId: string; title: string; questions: number };

const KINDS = Object.keys(KIND_LABEL) as ExamKind[];
const FIELDS = ["title", "subjectCode", "kind", "images", "answers", "files"];

// Tải đề từ một thư mục (images/Qn.webp, kèm ans.json nếu có đáp án): tạo đề mới, hoặc bổ sung/thay ảnh cho đề đã có. Tạo mới từ thư mục khác thì lưu thành tài liệu
interface Props {
  target: UploadTarget;
  onDone: (job: UploadJob) => void; // máy chủ đã nhận đề, xử lý tiếp chạy nền
  onBusy?: (busy: boolean) => void;
  onCancel?: () => void; // có thì hiện nút Huỷ (dùng trong hộp thoại)
  onQueued?: (job: UploadJob) => void; // có thì thả được nhiều thư mục đề một lần (tải hàng loạt, form không bị làm trống)
}

export function ExamUploadForm({ target, onDone, onBusy, onCancel, onQueued }: Props) {
  const create = target.mode === "create";
  const subjects = useApi(() => (create ? subjectApi.subjects() : Promise.resolve(null)), [create]);
  const submit = useSubmit("Chưa tải được đề lên, bạn thử lại nhé", FIELDS);
  const { confirm, confirmDialog } = useConfirm();
  const [title, setTitle] = useState(create ? (target.title ?? "") : "");
  const [subjectCode, setSubjectCode] = useState(create ? (target.subjectCode ?? "") : "");
  const [kind, setKind] = useState<ExamKind>(create && target.kind ? target.kind : "FE");
  const kindPicked = useRef(create && !!target.kind); // admin đã tự chọn loại (hoặc đề được mở sẵn với loại): thôi tự đoán theo tên
  const [folder, setFolder] = useState<{ check: FolderCheck<File>; ansJson: string | null } | null>(null);
  const [resource, setResource] = useState<ResourceCheck<File> | null>(null);
  const [batch, setBatch] = useState<FolderEntry<File>[][] | null>(null);
  const [missing, setMissing] = useState<{ title?: string; subjectCode?: string; folder?: string }>({});
  const auto = useRef({ title: "", subjectCode: "" }); // giá trị đã tự điền từ tên thư mục: chọn thư mục khác thì được đổi theo, admin đã tự sửa thì giữ
  const busy = submit.loading;
  const switchKind = (k: ExamKind) => {
    kindPicked.current = true;
    setKind(k);
  };
  // Loại đề tự đoán theo tên đề (FE / PE / Quiz); không thấy từ khoá thì FE, admin chọn tay rồi thì giữ lựa chọn đó
  useEffect(() => {
    if (create && !kindPicked.current) setKind(kindFromTitle(title) ?? "FE");
  }, [create, title]);
  useEffect(() => {
    onBusy?.(busy);
  }, [busy, onBusy]);

  const pick = async (entries: FolderEntry<File>[]) => {
    submit.clear();
    const groups = groupByFolder(entries);
    if (create && onQueued && groups.length > 1) {
      setBatch(groups);
      return;
    }
    setMissing((m) => ({ ...m, folder: undefined }));
    const named = create ? nameFromFolder(entries.map((e) => e.path)) : null;
    if (named) {
      if (!title.trim() || title === auto.current.title) {
        setTitle(named.title);
        auto.current.title = named.title;
        setMissing((m) => ({ ...m, title: undefined }));
      }
      const known = named.subjectCode && subjects.data?.some((s) => s.code === named.subjectCode);
      if (known && (!subjectCode || subjectCode === auto.current.subjectCode)) {
        setSubjectCode(named.subjectCode!);
        auto.current.subjectCode = named.subjectCode!;
        setMissing((m) => ({ ...m, subjectCode: undefined }));
      }
      if (named.kind && !kindPicked.current) setKind(named.kind); // cả khi tên đề đã gõ sẵn: tên thư mục có loại thì theo
    }
    // Tạo mới mà không phải thư mục đề (xem isQuizFolder): lưu thành tài liệu. Bổ sung ảnh luôn đi đường đề trắc nghiệm
    const asResource = create && !isQuizFolder(entries.map((e) => e.path));
    setResource(asResource ? checkResources(entries) : null);
    if (asResource) {
      setFolder(null);
      return;
    }
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

  // Tên đề đã có: hỏi admin, đồng ý thì gửi lại với overwrite (thay tệp/ảnh cũ bằng bản mới). undefined = admin không đồng ý
  const sendOrOverwrite = async <T,>(send: (overwrite: boolean) => Promise<T>): Promise<T | undefined> => {
    try {
      return await send(false);
    } catch (err) {
      if (!(err instanceof ApiError) || err.code !== "EXAM_TITLE_EXISTS") throw err;
      const ok = await confirm({
        title: "Đề này đã có, ghi đè?",
        message: <>Đã có đề tên "{title.trim()}". Ghi đè sẽ thay {resource ? "toàn bộ tệp tài liệu cũ bằng các tệp mới" : "ảnh và đáp án các câu trùng số của đề cũ bằng bản mới"}. Dữ liệu cũ không khôi phục được.</>,
        confirmLabel: "Ghi đè",
        tone: "danger",
      });
      return ok ? send(true) : undefined;
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const check = folder?.check;
    const total = resource ? resource.files.reduce((s, f) => s + f.file.size, 0) : (check?.items.reduce((s, i) => s + i.file.size, 0) ?? 0);
    const next = {
      title: create && !title.trim() ? "Nhập tên đề" : undefined,
      subjectCode: create && !subjectCode ? "Chọn môn của đề" : undefined,
      folder: !check && !resource ? "Chọn thư mục đề" : total > MAX_TOTAL_BYTES ? `Tổng dung lượng ${resource ? "tệp" : "ảnh"} quá lớn. Hãy chia thành nhiều lần tải.` : undefined,
    };
    setMissing(next);
    if (next.title || next.subjectCode || next.folder) return;
    if (resource) {
      if (resource.errors.length) return;
      void submit.run(async () => {
        const r = await sendOrOverwrite((overwrite) => examUploadApi.createResource({ title, subjectCode, kind, files: resource.files.map((f) => f.file), overwrite }));
        if (!r) return;
        onDone(r);
      });
      return;
    }
    if (!folder || !check || check.errors.length) return;
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
      const r = create ? await sendOrOverwrite((overwrite) => examUploadApi.create({ ...input, title, subjectCode, kind, overwrite })) : await examUploadApi.addImages(target.examId, input);
      if (r) onDone(r);
    });
  };

  if (batch && onQueued) return <BatchUpload groups={batch} subjectCodes={subjects.data?.map((s) => s.code) ?? []} onJob={onQueued} onCancel={() => setBatch(null)} />;

  const check = folder?.check;
  const notes = check ?? resource;
  const blocked = !!notes?.errors.length;
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
            <Select label="Loại đề" value={kind} onChange={(e) => switchKind(e.target.value as ExamKind)} disabled={busy} error={submit.fieldErrors.kind}>
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

      <FolderPicker onPick={(entries) => void pick(entries)} disabled={busy} error={missing.folder ?? submit.fieldErrors.images ?? submit.fieldErrors.answers ?? submit.fieldErrors.files} />

      {resource && (
        <p className="md-body-medium rounded-m3-sm bg-secondary-container px-4 py-3 text-on-secondary-container">
          Thư mục này không phải đề trắc nghiệm (cần images/Q&lt;số&gt;.webp, kèm ans.json nếu thư mục còn tệp khác) nên sẽ lưu thành tài nguyên: sinh viên mở hoặc tải các tệp về, không làm bài và không chấm điểm.
        </p>
      )}

      {create && resource && kind === "FE" && (
        <p role="status" className="md-body-medium rounded-m3-sm bg-warning-container px-4 py-3 text-on-warning-container">
          Đề FE thường là thư mục ảnh câu hỏi images/, còn thư mục này thì không. Đây có phải đề PE không?{" "}
          <button type="button" onClick={() => switchKind("PE")} className="font-semibold underline underline-offset-2">
            Đổi sang PE
          </button>
        </p>
      )}
      {create && folder?.ansJson != null && kind === "PE" && (
        <p role="status" className="md-body-medium rounded-m3-sm bg-warning-container px-4 py-3 text-on-warning-container">
          Thư mục này có ảnh câu hỏi và ans.json giống đề FE (làm và chấm điểm trên web), nhưng loại đề đang là PE. Bạn chắc chứ?{" "}
          <button type="button" onClick={() => switchKind("FE")} className="font-semibold underline underline-offset-2">
            Đổi sang FE
          </button>
        </p>
      )}

      {notes && (
        <>
          {check && check.root !== null && check.root !== "" && <p className="md-body-small break-words text-on-surface-variant">Thư mục đề: {check.root}</p>}
          {notes.errors.length > 0 && (
            <ul role="alert" className="md-body-medium list-disc space-y-1 break-words rounded-m3-sm bg-error-container py-3 pl-8 pr-4 text-on-error-container">
              {notes.errors.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
          {notes.warnings.length > 0 && (
            <ul className="md-body-medium list-disc space-y-1 break-words rounded-m3-sm bg-warning-container py-3 pl-8 pr-4 text-on-warning-container">
              {notes.warnings.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
          {check && check.items.length > 0 && <FolderPreview items={check.items} replaced={check.replaced} />}
          {resource && <ResourcePreview check={resource} />}
        </>
      )}

      {busy && (
        <div className="space-y-1.5">
          <p className="md-body-small text-on-surface-variant">{resource ? `Đang tải ${resource.files.length} tệp lên` : `Đang tải ${check?.items.length ?? 0} ảnh lên`}, đừng đóng trang nhé…</p>
          <LinearProgress label={resource ? "Đang tải tệp lên" : "Đang tải ảnh lên"} />
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
          <Upload size={16} aria-hidden /> {busy ? "Đang tải lên…" : submit.retryIn > 0 ? `Thử lại sau ${submit.retryIn} giây` : resource ? "Lưu tài liệu" : create ? "Tạo đề" : "Tải ảnh lên"}
        </Button>
      </div>
    </form>
  );
}
