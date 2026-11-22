import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { LinearProgress, Spinner } from "@/shared/ui/Feedback";
import { formatDateTime } from "@/shared/utils/formatters";
import { fuoSourcesApi, type FuoSourceScan, type FuoSourcesStatus } from "./fuo-sources.api";

// Nút "Load dữ liệu mới" + tiến độ: chỉ tìm tên các đề mới trên FuOverflow (scan); đề chỉ được tải khi có người mở.
// Lượt nạp cũ (run) chỉ hiện khi đang chạy dở.
export function RunCard({ status, running, onStatus }: { status: FuoSourcesStatus; running: boolean; onStatus: (s: FuoSourcesStatus) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = status.run;
  const scan = status.scan;

  const start = async () => {
    setBusy(true);
    try {
      const r = await fuoSourcesApi.start();
      onStatus(r);
      toast.success(r.started ? "Đã bắt đầu tìm đề mới" : "Đang chạy rồi");
    } catch (err) {
      toast.error(errorMessage(err, "Chưa bắt đầu được, thử lại sau"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Tìm đề mới"
        description="Kiểm tra mọi môn trên FuOverflow và lưu tên các đề mới vào kho đề của từng môn, không cần dán link. Ảnh, tệp và bình luận của đề chỉ được tải khi có người mở đề."
        action={
          <Button variant="filled" onClick={() => void start()} disabled={running || busy}>
            {running || busy ? <Spinner size={18} className="text-current" /> : <RefreshCw size={18} />}
            Load dữ liệu mới
          </Button>
        }
      />
      <div className="space-y-3 px-5 py-4">
        {scan?.status === "NEEDS_AUTH" && (
          <p role="alert" className={ALERT}>
            Lần kiểm tra trước dừng giữa chừng. Bấm Load dữ liệu mới để chạy tiếp.
          </p>
        )}
        {scan?.status === "FAILED" && (
          <p role="alert" className={ALERT}>
            Kiểm tra FuOverflow bị dừng giữa chừng{scan.lastError && `: ${scan.lastError}`}. Bấm Load dữ liệu mới để chạy lại.
          </p>
        )}
        {scan?.status === "RUNNING" ? (
          <>
            <LinearProgress value={scan.subjectsTotal ? (scan.subjectsDone + scan.subjectsFailed) / scan.subjectsTotal : 0} label="Tiến độ tìm đề mới" />
            <p aria-live="polite" className="md-body-medium tabular-nums text-on-surface">
              Đang tìm tên đề mới trên FuOverflow: {scan.subjectsDone + scan.subjectsFailed}/{scan.subjectsTotal} môn · {scan.threadsNew} đề mới
            </p>
            {scan.coolingDownUntil && (
              <p className="md-body-small text-on-surface-variant">FuOverflow đang hạn chế truy cập, tạm nghỉ đến {formatDateTime(scan.coolingDownUntil)} rồi tự chạy tiếp.</p>
            )}
          </>
        ) : scan?.status === "DONE" ? (
          <ScanResult scan={scan} />
        ) : (
          !scan && !run && <p className="md-body-medium text-on-surface-variant">Chưa chạy lần nào.</p>
        )}
        {run?.status === "RUNNING" && (
          <p aria-live="polite" className="md-body-medium tabular-nums text-on-surface">
            Đang nạp đề: {run.done + run.failed}/{run.total} đề · {run.imported} mới · {run.updated} cập nhật · {run.failed} lỗi
          </p>
        )}
      </div>
    </Card>
  );
}

const ALERT = "md-body-medium rounded-m3-sm bg-error-container px-4 py-3 text-on-error-container";

// Kết quả lần tìm gần nhất: tổng và số đề mới theo môn (danh sách có thể bị cắt ở backend: báo số môn còn lại)
function ScanResult({ scan }: { scan: FuoSourceScan }) {
  const subjects = scan.newBySubject ?? [];
  const more = (scan.subjectsWithNew ?? subjects.length) - subjects.length;
  return (
    <>
      <p className="md-body-medium tabular-nums text-on-surface">
        Đã kiểm tra {scan.subjectsDone}/{scan.subjectsTotal} môn · {scan.threadsNew} đề mới{scan.subjectsFailed > 0 && ` · ${scan.subjectsFailed} môn lỗi`}
      </p>
      {subjects.length > 0 && (
        <ul aria-label="Đề mới theo môn" className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
          {subjects.map((s) => (
            <li key={s.code} className="md-label-large rounded-m3-sm bg-surface-container-high px-2 py-1 tabular-nums text-on-surface">
              {s.code}: {s.threadsNew}
            </li>
          ))}
          {more > 0 && <li className="md-label-large px-2 py-1 text-on-surface-variant">và {more} môn khác</li>}
        </ul>
      )}
      {scan.finishedAt && <p className="md-body-small text-on-surface-variant">Xong lúc {formatDateTime(scan.finishedAt)}</p>}
    </>
  );
}
