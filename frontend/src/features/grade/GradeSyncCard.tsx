import { useState } from "react";
import { GraduationCap, Loader2, ShieldCheck } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { Switch } from "@/shared/ui/Switch";
import { gradeApi, type GradeOverview } from "./grade.api";
import { useGradeBridge } from "./useGradeBridge";
import { useConfirm } from "@/shared/ui/ConfirmDialog";

const FAP_GRADE_URL = "https://fap.fpt.edu.vn/Report/Grade";

// Công tắc "Đồng bộ điểm FAP": mặc định TẮT. Bật thì tiện ích Chrome mới được đọc Báo cáo điểm của chính bạn trên FAP.
export function GradeSyncCard({ overview, onChange }: { overview: GradeOverview; onChange: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { installed, outdated, error } = useGradeBridge(overview.enabled, onChange);
  const { confirm, confirmDialog } = useConfirm();

  const toggle = async (next: boolean) => {
    if (!next && !(await confirm({ title: "Tắt đồng bộ và xoá điểm đã lưu?", message: "Điểm, lịch thi và các dự đoán điểm đã lưu trên FEPass sẽ bị xoá và không khôi phục được. Bạn có thể bật lại và đồng bộ lại từ FAP bất cứ lúc nào.", confirmLabel: "Tắt và xoá", tone: "danger" }))) return;
    setBusy(true);
    try {
      await gradeApi.setEnabled(next);
      toast.success(next ? "Đã bật đồng bộ điểm FAP" : "Đã tắt đồng bộ và xoá điểm đã lưu");
      onChange();
    } catch (err) {
      toast.error(errorMessage(err, "Chưa đổi được cài đặt"));
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    if (!(await confirm({ title: "Xoá điểm đã lưu?", message: "Toàn bộ điểm và lịch thi đã đồng bộ từ FAP sẽ bị xoá khỏi FEPass và không khôi phục được. Công tắc đồng bộ vẫn giữ nguyên.", confirmLabel: "Xoá", tone: "danger" }))) return;
    setBusy(true);
    try {
      await gradeApi.clear();
      toast.success("Đã xoá điểm đã lưu");
      onChange();
    } catch (err) {
      toast.error(errorMessage(err, "Chưa xoá được"));
    } finally {
      setBusy(false);
    }
  };

  // Đã bật và có điểm: chỉ còn một dòng gọn, hướng dẫn đầy đủ chỉ hiện khi cần
  if (overview.enabled && overview.courses.length > 0 && installed && !outdated && !error) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-m3-lg border border-outline-variant bg-surface-container-lowest px-4 py-3">
        {confirmDialog}
        <div className="flex items-center gap-3">
          <Switch checked onChange={(v) => void toggle(v)} label="Đồng bộ điểm FAP" disabled={busy} />
          <div>
            <p className="md-title-small text-on-surface">Đồng bộ điểm FAP đang bật</p>
            <p className="md-body-small text-on-surface-variant">{overview.syncedAt ? `Cập nhật lần cuối: ${new Date(overview.syncedAt).toLocaleString("vi-VN")}` : "Chưa có lần cập nhật nào"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={FAP_GRADE_URL} target="_blank" rel="noopener noreferrer" className="md-label-large text-primary underline">
            Mở FAP để cập nhật
          </a>
          <Button variant="outlined" size="sm" onClick={() => void clear()} disabled={busy}>
            Xoá điểm đã lưu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card>
      {confirmDialog}
      <CardHeader title="Đồng bộ điểm FAP" description="Cá nhân hoá: biết bạn cần bao nhiêu điểm thi cuối kỳ để qua từng môn" />
      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-4">
          <span className="md-title-small flex items-center gap-2 text-on-surface">
            <GraduationCap size={18} /> Cho phép FePass dùng điểm FAP của tôi
          </span>
          <Switch checked={overview.enabled} onChange={(v) => void toggle(v)} label="Đồng bộ điểm FAP" disabled={busy} />
        </div>
        <p className="md-body-small flex items-start gap-2 text-on-surface-variant">
          <ShieldCheck size={16} className="mt-0.5 shrink-0" />
          <span>Chỉ đọc Báo cáo điểm của chính bạn, bằng phiên đăng nhập FAP của bạn trong trình duyệt. FePass không lưu mật khẩu FAP. Tắt công tắc là xoá toàn bộ điểm đã lưu.</span>
        </p>
        {overview.enabled && (
          <ol className="md-body-medium list-decimal space-y-1 pl-5 text-on-surface-variant">
            <li>Cài tiện ích Chrome FePass (bản 1.4.0 trở lên){installed && !outdated ? " ✓" : ""}.</li>
            <li>
              Mở{" "}
              <a href={FAP_GRADE_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                Báo cáo điểm trên FAP
              </a>
              . FAP có bước kiểm tra Cloudflare: hãy hoàn thành bước đó và đăng nhập FAP bằng tài khoản của bạn thì tiện ích mới đọc được điểm.
            </li>
            <li>Tiện ích tự đọc điểm; quay lại trang này để xem điểm cần đạt cho từng môn.</li>
          </ol>
        )}
        {overview.enabled && !installed && <p className="rounded-m3-md bg-warning-container px-4 py-3 text-sm text-on-warning-container">Chưa thấy tiện ích FePass. Hãy cài hoặc cập nhật tiện ích rồi tải lại trang.</p>}
        {overview.enabled && outdated && <p className="rounded-m3-md bg-warning-container px-4 py-3 text-sm text-on-warning-container">Tiện ích của bạn cũ, chưa đồng bộ được điểm. Hãy cập nhật lên bản 1.4.0 trở lên.</p>}
        {error && <p className="rounded-m3-md bg-error-container px-4 py-3 text-sm text-on-error-container">{error}</p>}
        {overview.enabled && overview.courses.length > 0 && (
          <Button variant="outlined" onClick={() => void clear()} disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            Xoá điểm đã lưu
          </Button>
        )}
      </div>
    </Card>
  );
}
