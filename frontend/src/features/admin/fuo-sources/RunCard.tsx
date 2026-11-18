import { useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { LinearProgress, Spinner } from "@/shared/ui/Feedback";
import { formatDateTime } from "@/shared/utils/formatters";
import { fuoSourcesApi, type FuoSourcesStatus } from "./fuo-sources.api";

// Nút "Load dữ liệu mới" + tiến độ của lượt gần nhất
export function RunCard({ status, running, onStatus }: { status: FuoSourcesStatus; running: boolean; onStatus: (s: FuoSourcesStatus) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = status.run;

  const start = async () => {
    setBusy(true);
    try {
      const r = await fuoSourcesApi.start();
      onStatus(r);
      toast.success(r.started ? "Đã bắt đầu tải dữ liệu mới" : "Đang chạy rồi");
    } catch (err) {
      toast.error(errorMessage(err, "Chưa bắt đầu được, thử lại sau"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Tải dữ liệu mới"
        description="Đề chưa có sẽ được nhập. Đề đã có chỉ được bổ sung câu mới, ảnh và bình luận; câu và đáp án cũ giữ nguyên."
        action={
          <Button variant="filled" onClick={() => void start()} disabled={running || busy}>
            {running || busy ? <Spinner size={18} className="text-current" /> : <RefreshCw size={18} />}
            Load dữ liệu mới
          </Button>
        }
      />
      <div className="space-y-3 px-5 py-4">
        {run ? (
          <>
            <LinearProgress value={run.total ? (run.done + run.failed) / run.total : 0} label="Tiến độ tải dữ liệu" />
            <p aria-live="polite" className="md-body-medium tabular-nums text-on-surface">
              {run.done + run.failed}/{run.total} đề · {run.imported} mới · {run.updated} cập nhật · {run.failed} lỗi
            </p>
            {run.status === "DONE" && run.finishedAt && <p className="md-body-small text-on-surface-variant">Xong lúc {formatDateTime(run.finishedAt)}</p>}
            {run.status === "NEEDS_AUTH" && (
              <p role="alert" className="md-body-medium rounded-m3-sm bg-error-container px-4 py-3 text-on-error-container">
                Đã tạm dừng vì không đăng nhập được FuOverflow. Cập nhật cookie hoặc tài khoản ở{" "}
                <Link to="/admin/crawler" className="font-medium underline">
                  Cấu hình lấy đề
                </Link>
                , rồi bấm Load dữ liệu mới để chạy tiếp.
              </p>
            )}
          </>
        ) : (
          <p className="md-body-medium text-on-surface-variant">Chưa chạy lần nào.</p>
        )}
        <p className="md-body-small text-on-surface-variant">
          Câu mới chưa có đáp án cho tới khi được giải bằng công cụ admin. Đề có thứ tự câu khác FuOverflow sẽ được bỏ qua và đánh dấu cần kiểm tra thủ công.
        </p>
      </div>
    </Card>
  );
}
