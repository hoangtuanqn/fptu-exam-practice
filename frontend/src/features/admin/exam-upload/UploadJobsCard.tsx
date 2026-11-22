import { Link } from "react-router-dom";
import { Badge, type Tone } from "@/shared/ui/Badge";
import { buttonClass } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import type { UploadJob, UploadJobStatus } from "./exam-upload.api";

const STATUS: Record<UploadJobStatus, [string, Tone]> = {
  QUEUED: ["Đang chờ", "neutral"],
  RUNNING: ["Đang xử lý", "info"],
  DONE: ["Xong", "success"],
  FAILED: ["Lỗi", "danger"],
};
const SHOWN = 5; // chỉ vài lượt gần nhất cho gọn

// Các lượt tải đề gần đây đang/đã xử lý nền. Không có lượt nào thì ẩn
export function UploadJobsCard({ jobs, className = "" }: { jobs: UploadJob[]; className?: string }) {
  if (!jobs.length) return null;
  return (
    <Card className={className}>
      <CardHeader title="Đang xử lý nền" />
      <div role="status" aria-live="polite"><ul className="divide-y divide-outline-variant">
        {jobs.slice(0, SHOWN).map((j) => {
          const [label, tone] = STATUS[j.status] ?? STATUS.QUEUED;
          return (
            <li key={j.uploadId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3">
              <Badge tone={tone}>{label}</Badge>
              <div className="min-w-0 flex-1">
                <div className="md-title-small break-words text-on-surface">{j.title}</div>
                <div className="md-body-small text-on-surface-variant">
                  {j.status === "DONE" && j.result
                    ? `${j.result.questions} câu, ${j.result.answered} câu có đáp án`
                    : j.status === "FAILED"
                      ? <span className="text-error">{j.error ?? "Không xử lý được lần tải đề này."}</span>
                      : `${j.files} tệp`}
                </div>
              </div>
              {j.status === "DONE" && j.result && (
                <Link to={`/admin/exams/${j.result.id}`} aria-label={`Xem đề ${j.title}`} className={buttonClass({ variant: "text", size: "sm" })}>
                  Xem đề
                </Link>
              )}
            </li>
          );
        })}
      </ul></div>
    </Card>
  );
}
