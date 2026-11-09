import { useState } from "react";
import { GraduationCap, Loader2, ShieldCheck } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { Switch } from "@/shared/ui/Switch";
import { gradeApi, type GradeOverview } from "./grade.api";
import { useGradeBridge } from "./useGradeBridge";

const FAP_GRADE_URL = "https://fap.fpt.edu.vn/Report/Grade";

// Công tắc "Đồng bộ điểm FAP": mặc định TẮT. Bật thì tiện ích Chrome mới được đọc Báo cáo điểm của chính bạn trên FAP.
export function GradeSyncCard({ overview, onChange }: { overview: GradeOverview; onChange: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { installed, outdated, error } = useGradeBridge(overview.enabled, onChange);

  const toggle = async (next: boolean) => {
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

  return (
    <Card>
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
