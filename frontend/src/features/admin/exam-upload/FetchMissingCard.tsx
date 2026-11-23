import { useEffect, useRef, useState } from "react";
import { DownloadCloud } from "lucide-react";
import { Link } from "react-router-dom";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { Button } from "@/shared/ui/Button";
import { LinearProgress, Spinner } from "@/shared/ui/Feedback";
import { fuoSourcesApi } from "@/features/admin/fuo-sources/fuo-sources.api";
import { useFuoSourcesStatus } from "@/features/admin/fuo-sources/useFuoSourcesStatus";
import { FetchMissingPicker } from "./FetchMissingPicker";

interface Props {
  noExam: number | undefined; // chỉ truyền ở tab "Chưa có đề": có số > 0 mới hiện nút; tiến độ thì hiện ở mọi tab
  filters: { kind?: string; subject?: string; q?: string };
  onDone: () => void; // lượt lấy đề chạy xong: nạp lại danh sách và số đếm
}

const LINK = "md-label-large inline-flex min-h-10 items-center text-primary underline underline-offset-2";

// Nút "Lấy tất cả đề chưa có" mở popup chọn đề, rồi xếp vào lượt chạy nền; kèm tiến độ lượt (realtime, mất kết nối thì hỏi định kỳ)
export function FetchMissingCard({ noExam, filters, onDone }: Props) {
  const toast = useToast();
  const { status, set } = useFuoSourcesStatus();
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [startedHere, setStartedHere] = useState(false);
  const run = status?.run;

  const prev = useRef(run?.status);
  useEffect(() => {
    if (prev.current === "RUNNING" && run?.status === "DONE") onDone();
    prev.current = run?.status;
  }, [run?.status, onDone]);

  // threadIds: các đề đã tick; undefined = mọi đề còn thiếu theo bộ lọc (tiếp tục lượt dừng cũng dùng cách này)
  const runFetch = async (threadIds?: string[]) => {
    setBusy(true);
    try {
      const r = await fuoSourcesApi.fetchMissing({ ...filters, ...(threadIds && { threadIds }) });
      set(r);
      setStartedHere(true);
      toast.success(
        r.started ? `Đã xếp ${r.queued} đề vào hàng chờ` : r.queued > 0 ? `Đang chạy rồi, đã thêm ${r.queued} đề vào hàng chờ` : "Không có đề nào cần lấy thêm hoặc đang có lượt khác chạy",
      );
    } catch (err) {
      toast.error(errorMessage(err, "Chưa bắt đầu lấy đề được, thử lại sau"));
    } finally {
      setBusy(false);
    }
  };

  const showRun = run && (run.status !== "DONE" || startedHere);
  const finished = run ? run.done + run.failed : 0;
  const stopping = !!status?.stopping;

  const stopRun = async () => {
    try {
      const r = await fuoSourcesApi.stop();
      set(r);
      toast.success(r.stopping ? "Sẽ dừng sau khi đề đang lấy xong" : "Không có lượt nào đang chạy");
    } catch (err) {
      toast.error(errorMessage(err, "Chưa dừng được lượt, thử lại sau"));
    }
  };

  return (
    <>
      {!!noExam && noExam > 0 && (
        <Button variant="primary" onClick={() => setPicking(true)} disabled={busy}>
          {busy ? <Spinner size={18} className="text-current" /> : <DownloadCloud size={18} aria-hidden />}
          Lấy tất cả đề chưa có ({noExam.toLocaleString("vi-VN")})
        </Button>
      )}
      {picking && (
        <FetchMissingPicker
          filters={filters}
          busy={busy}
          onClose={() => setPicking(false)}
          onStart={(threadIds) => {
            setPicking(false);
            void runFetch(threadIds);
          }}
        />
      )}
      {showRun && (
        <div className="space-y-2 rounded-m3-sm bg-surface-container-high px-4 py-3">
          <LinearProgress value={run.total ? finished / run.total : 0} label="Tiến độ lấy đề" />
          <p aria-live="polite" className="md-body-medium tabular-nums text-on-surface">
            {run.status === "DONE" ? "Đã lấy xong" : run.status === "RUNNING" ? "Đang lấy đề" : "Tạm dừng"}: {finished}/{run.total} đề · {run.imported} đề mới · {run.failed} lỗi
          </p>
          {run.status === "RUNNING" && (
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" variant="outlined" onClick={() => void stopRun()} disabled={stopping}>
                {stopping ? "Đang chờ đề hiện tại xong rồi dừng" : "Dừng sau đề hiện tại"}
              </Button>
            </div>
          )}
          {run.status === "NEEDS_AUTH" && (
            <div role="alert" className="md-body-medium space-y-2 rounded-m3-sm bg-error-container px-4 py-3 text-on-error-container">
              <p>{run.lastError || "Tạm dừng vì đăng nhập FuOverflow lỗi hoặc FuOverflow đang hạn chế truy cập."}</p>
              <p>Kiểm tra cookie trong cấu hình lấy đề; nếu bị giới hạn truy cập, hãy chờ một thời gian rồi bấm Tiếp tục.</p>
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/admin/crawler" className={LINK}>
                  Mở cấu hình lấy đề
                </Link>
                <Button size="sm" variant="primary" onClick={() => void runFetch()} disabled={busy}>
                  Tiếp tục
                </Button>
              </div>
            </div>
          )}
          <Link to="/admin/fuo-sources" className={LINK}>
            Xem chi tiết
          </Link>
        </div>
      )}
    </>
  );
}
