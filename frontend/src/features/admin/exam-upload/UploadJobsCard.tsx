import { AlertCircle, Loader2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, type Tone } from "@/shared/ui/Badge";
import { Button, IconButton, buttonClass } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import type { UploadJob, UploadJobStatus } from "./exam-upload.api";
import { isActive } from "./useUploadJobs";

const STATUS: Record<UploadJobStatus, [string, Tone]> = {
  QUEUED: ["Đang chờ", "neutral"],
  RUNNING: ["Đang xử lý", "info"],
  DONE: ["Xong", "success"],
  FAILED: ["Lỗi", "danger"],
};
const SHOWN = 10; // chỉ vài lượt gần nhất cho gọn
export const HISTORY_ID = "upload-history";

// Dòng tóm tắt ngay dưới tiêu đề: chỉ hiện khi còn lượt đang chờ/chạy hoặc bị lỗi (lượt đã xong không cần báo)
export function UploadJobsSummary({ jobs, className = "" }: { jobs: UploadJob[]; className?: string }) {
  const active = jobs.filter(isActive).length;
  const failed = jobs.filter((j) => j.status === "FAILED").length;
  if (!active && !failed) return null;
  return (
    <div role="status" aria-live="polite" className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-surface-container px-4 py-3 ${className}`}>
      {active > 0 && (
        <span className="md-body-medium inline-flex items-center gap-2 text-on-surface">
          <Loader2 size={16} aria-hidden className="animate-spin text-primary motion-reduce:animate-none" />
          {active} tiến trình đang xử lý
        </span>
      )}
      {failed > 0 && (
        <span className="md-body-medium inline-flex items-center gap-2 text-error">
          <AlertCircle size={16} aria-hidden />
          {failed} tiến trình lỗi
        </span>
      )}
      <a href={`#${HISTORY_ID}`} className="md-label-large ml-auto text-primary hover:underline">
        Xem chi tiết
      </a>
    </div>
  );
}

// Lịch sử các lượt tải đề, đặt dưới form. Lượt đã xong/lỗi có nút X để xoá khỏi danh sách; không có lượt nào thì ẩn
export function UploadJobsHistory({ jobs, onDismiss, className = "" }: { jobs: UploadJob[]; onDismiss: (id?: string) => void; className?: string }) {
  if (!jobs.length) return null;
  const finished = jobs.filter((j) => !isActive(j)).length;
  return (
    <Card className={className}>
      <div id={HISTORY_ID} className="scroll-mt-24" />
      <CardHeader
        title="Lịch sử tải đề"
        description="Các lượt tải đề gần đây."
        action={
          finished > 1 ? (
            <Button variant="text" size="sm" onClick={() => onDismiss()}>
              Xoá tất cả đã xong
            </Button>
          ) : undefined
        }
      />
      <ul className="divide-y divide-outline-variant">
        {jobs.slice(0, SHOWN).map((j) => {
          const [label, tone] = STATUS[j.status] ?? STATUS.QUEUED;
          return (
            <li key={j.uploadId} className="flex items-center gap-x-3 px-5 py-3">
              <Badge tone={tone}>{label}</Badge>
              <div className="min-w-0 flex-1">
                <div className="md-title-small break-words text-on-surface">{j.title}</div>
                <div className="md-body-small text-on-surface-variant">
                  {j.status === "DONE" && j.result ? (
                    `${j.result.questions} câu, ${j.result.answered} câu có đáp án`
                  ) : j.status === "FAILED" ? (
                    <span className="text-error">{j.error ?? "Không xử lý được lần tải đề này."}</span>
                  ) : (
                    `${j.files} tệp`
                  )}
                </div>
              </div>
              {j.status === "DONE" && j.result && (
                <Link to={`/admin/exams/${j.result.id}`} aria-label={`Xem đề ${j.title}`} className={buttonClass({ variant: "text", size: "sm" })}>
                  Xem đề
                </Link>
              )}
              {!isActive(j) && j.uploadId && (
                <IconButton label={`Xoá lượt tải ${j.title}`} onClick={() => onDismiss(j.uploadId)}>
                  <X size={18} aria-hidden />
                </IconButton>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
