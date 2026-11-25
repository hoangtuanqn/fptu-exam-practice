import { useRef, useState, type DragEvent } from "react";
import { Loader2, Paperclip, Plus } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { examUploadApi, type UploadJob } from "@/features/admin/exam-upload/exam-upload.api";
import { isActive, useUploadJobs } from "@/features/admin/exam-upload/useUploadJobs";
import type { ExamAttachment } from "@/features/exam/types";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { Empty, LinearProgress } from "@/shared/ui/Feedback";
import { AttachmentRow } from "./AttachmentRow";

const extOf = (name: string) => name.slice(name.lastIndexOf(".") + 1).toLowerCase();

// Quản lý tệp đính kèm của đề: thêm (chọn hoặc kéo thả), đổi tên, thay thế, xoá. Thêm/thay chạy nền, xong thì onChanged tải lại trang
export function AttachmentManager({ examId, attachments, onChanged }: { examId: string; attachments: ExamAttachment[]; onChanged: () => void }) {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const { jobs, add } = useUploadJobs(onChanged);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [mine, setMine] = useState<string[]>([]); // lượt chạy nền do trang này gửi
  const addInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const replacing = useRef<ExamAttachment | null>(null);
  const processing = jobs.filter((j) => j.uploadId && mine.includes(j.uploadId) && isActive(j)).reduce((n, j) => n + j.files, 0);
  const status = uploading ? "Đang gửi tệp, xong thì tệp được xử lý tiếp ở nền" : processing > 0 ? `Đang xử lý ${processing} tệp…` : null;

  async function run(fn: () => Promise<void>, fail: string) {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast.error(errorMessage(err, fail));
    } finally {
      setBusy(false);
    }
  }

  async function send(request: () => Promise<UploadJob>, fail: string) {
    setUploading(true);
    await run(async () => {
      const job = await request();
      if (job.uploadId) setMine((m) => [...m, job.uploadId!]);
      add(job);
    }, fail);
    setUploading(false);
  }

  const upload = (files: File[]) => {
    if (files.length && !busy) void send(() => examUploadApi.addAttachments(examId, files), "Chưa tải tệp lên được");
  };

  async function replace(file: File) {
    const a = replacing.current;
    if (!a) return;
    // Khác đuôi tệp thì lấy luôn tên mới, để tên không lệch với nội dung (vd. .pdf mà là zip)
    const rename = extOf(file.name) !== extOf(a.name);
    const ok = await confirm({
      title: `Thay tệp ${a.name} bằng tệp đã chọn?`,
      message: rename ? `Tệp sẽ đổi tên thành ${file.name}.` : "Tên tệp giữ nguyên.",
      confirmLabel: "Thay thế",
      tone: "danger",
    });
    if (ok) await send(() => examUploadApi.replaceAttachment(examId, a.id, file, rename), "Chưa thay được tệp");
  }

  async function remove(a: ExamAttachment) {
    if (!(await confirm({ title: `Xoá tệp ${a.name}?`, message: "Không khôi phục được.", confirmLabel: "Xoá", tone: "danger" }))) return;
    await run(async () => {
      await adminApi.removeAttachment(examId, a.id);
      toast.success("Đã xoá tệp");
      onChanged();
    }, "Chưa xoá được tệp");
  }

  async function rename(a: ExamAttachment, name: string) {
    setBusy(true);
    try {
      await adminApi.renameAttachment(examId, a.id, name);
      toast.success("Đã đổi tên tệp");
      onChanged();
      return null;
    } catch (err) {
      return errorMessage(err, "Chưa đổi được tên tệp");
    } finally {
      setBusy(false);
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    upload([...e.dataTransfer.files]);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setDragging(false)}
      onDrop={onDrop}
      className="mb-4"
    >
      {confirmDialog}
      <Card className={dragging ? "ring-2 ring-primary" : ""}>
        <CardHeader
          title={`Tệp đính kèm (${attachments.length})`}
          description="Kéo thả tệp vào đây hoặc bấm Thêm tệp"
          action={
            <Button size="sm" variant="tonal" disabled={busy} onClick={() => addInput.current?.click()}>
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Thêm tệp
            </Button>
          }
        />
        {status && (
          <div className="space-y-1 px-5 pt-3" aria-live="polite">
            <LinearProgress label={status} />
            <p className="md-body-small text-on-surface-variant">{status}</p>
          </div>
        )}
        {attachments.length === 0 ? (
          <Empty icon={Paperclip} title="Chưa có tệp nào" />
        ) : (
          <ul className="divide-y divide-outline-variant">
            {attachments.map((a) => (
              <AttachmentRow
                key={a.id}
                a={a}
                disabled={busy}
                onRename={(name) => rename(a, name)}
                onReplace={() => {
                  replacing.current = a;
                  replaceInput.current?.click();
                }}
                onDelete={() => void remove(a)}
              />
            ))}
          </ul>
        )}
      </Card>
      <input
        ref={addInput}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          upload([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      <input
        ref={replaceInput}
        type="file"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void replace(file);
        }}
      />
    </div>
  );
}
