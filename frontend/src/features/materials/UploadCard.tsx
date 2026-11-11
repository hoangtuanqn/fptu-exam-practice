import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Upload } from "lucide-react";
import { ApiError } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { FormError, LinearProgress } from "@/shared/ui/Feedback";
import { Field } from "@/shared/ui/Input";
import { formatDateTime } from "@/shared/utils/formatters";
import { SubjectCombobox } from "@/features/subject/SubjectCombobox";
import { subjectApi } from "@/features/subject/subject.api";
import { materialsApi, resultPath, type MaterialQuota, type UploadResult } from "./materials.api";

// Một số trình duyệt không ghi loại file: khi đó dựa vào đuôi .pdf (máy chủ vẫn kiểm tra lại)
const isPdf = (f: File) => f.type === "application/pdf" || (!f.type && /\.pdf$/i.test(f.name));

const validDate = (iso: string | null | undefined) => (iso && !Number.isNaN(Date.parse(iso)) ? iso : null);

// Trùng với giới hạn của máy chủ (máy chủ vẫn kiểm tra lại)
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const TOO_LARGE = "File quá lớn, hãy chọn file nhỏ hơn";

// Mốc giờ dạng ISO lỡ lọt vào lời báo lỗi thì đổi sang giờ dễ đọc
const ISO_TIME = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?/g;
const humanize = (text: string) => text.replace(ISO_TIME, (s) => (Number.isNaN(Date.parse(s)) ? "" : formatDateTime(s))).trim();
const RAW_STATUS = /^(Lỗi|Error)\s*\d{3}\b/i;
// Các lỗi này máy chủ có câu tiếng Việt cụ thể (sai file, chưa có Pro, hết lượt, đang bận): giữ nguyên câu đó
const SERVER_TEXT = [400, 403, 422, 429, 503];

type UploadErrors = { subject?: string; file?: string; form?: string };

// Không để useSubmit xử lý lỗi: nó đẩy mọi `errors` thành lỗi theo trường và bỏ mất câu báo của máy chủ
function uploadErrors(err: unknown): UploadErrors {
  if (!(err instanceof ApiError)) return { form: errorMessage(err) };
  if (err.status === 413 || /^Lỗi 413\b/.test(err.message)) return { file: TOO_LARGE };
  if (err.status === 400 || err.status === 422) {
    const field = (k: string) => {
      const v = err.errors?.[k];
      return typeof v === "string" && v.trim() ? humanize(v) : undefined;
    };
    const fields = { subject: field("subjectCode"), file: field("file") };
    if (fields.subject || fields.file) return fields;
  }
  const text = humanize(err.message ?? "");
  if (SERVER_TEXT.includes(err.status) && text && !RAW_STATUS.test(text)) return { form: text };
  return { form: errorMessage(err) };
}

function QuotaBar({ quota }: { quota: MaterialQuota }) {
  const used = Math.max(0, Math.min(100, Math.round(Number(quota.percentUsed) || 0)));
  const resetsAt = validDate(quota.resetsAt);
  return (
    <div className="space-y-1.5">
      <div className="md-body-small flex flex-wrap justify-between gap-x-3 text-on-surface-variant">
        <span>
          Đã dùng <b className="text-on-surface">{used}%</b> lượt phân tích
        </span>
        {resetsAt && <span>Làm mới lúc {formatDateTime(resetsAt)}</span>}
      </div>
      <LinearProgress value={used / 100} label={`Đã dùng ${used}% lượt phân tích`} />
    </div>
  );
}

export function UploadCard({ quota, onUploaded }: { quota: MaterialQuota; onUploaded: () => void }) {
  const subjects = useApi(() => subjectApi.subjects(), []);
  const submit = useSubmit();
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<UploadErrors>({});

  const pickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    const problem = f && !isPdf(f) ? "Chỉ nhận file PDF" : f && f.size > MAX_UPLOAD_BYTES ? TOO_LARGE : undefined;
    if (problem) {
      e.target.value = "";
      setFile(null);
      setErrors((x) => ({ ...x, file: problem, form: undefined }));
      return;
    }
    setFile(f);
    setErrors((x) => ({ ...x, file: undefined, form: undefined }));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next = { subject: code ? undefined : "Chọn môn của slide", file: !file ? "Chọn file PDF" : file.size > MAX_UPLOAD_BYTES ? TOO_LARGE : undefined };
    setErrors(next);
    if (!code || !file || next.file) return;
    void submit.run(async () => {
      let r: UploadResult;
      try {
        r = await materialsApi.upload(file, code);
      } catch (err) {
        setErrors(uploadErrors(err));
        return;
      }
      if (r.duplicate) {
        toast.success("File này đã được phân tích trước đó, mở lại kết quả cũ");
        navigate(resultPath(r.id));
        return;
      }
      toast.success("Đã nhận file, đang phân tích");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      onUploaded();
    });
  };

  const subjectError = errors.subject ?? (subjects.error ? "Chưa tải được danh sách môn" : undefined);
  const fileError = errors.file;

  return (
    <Card>
      <CardHeader title="Tải slide lên" description="Chọn môn và file PDF slide của môn đó." />
      <form onSubmit={onSubmit} className="space-y-4 p-5" noValidate>
        <QuotaBar quota={quota} />
        <SubjectCombobox
          label="Môn học"
          subjects={subjects.error ? [] : (subjects.data ?? undefined)}
          value={code}
          onChange={(next) => {
            setCode(next);
            setErrors((x) => ({ ...x, subject: undefined }));
          }}
          error={subjectError}
        />
        <Field label="File slide (PDF)" error={fileError}>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={pickFile}
            aria-invalid={fileError ? true : undefined}
            className="md-body-medium block w-full min-w-0 text-on-surface-variant file:mr-3 file:text-sm file:font-medium file:h-10 file:cursor-pointer file:rounded-full file:border file:border-solid file:border-outline file:bg-transparent file:px-4 file:text-primary"
          />
        </Field>
        <p className="md-body-small flex items-start gap-2 text-on-surface-variant">
          <ShieldCheck size={16} className="mt-0.5 shrink-0" />
          File gốc được xoá ngay sau khi phân tích xong. Kết quả tự xoá vào ngày ghi ở từng mục bên dưới.
        </p>
        <FormError message={errors.form ?? submit.error} />
        <Button type="submit" variant="primary" disabled={submit.loading}>
          <Upload size={16} /> {submit.loading ? "Đang gửi…" : "Phân tích slide"}
        </Button>
      </form>
    </Card>
  );
}
