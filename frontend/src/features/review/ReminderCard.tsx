import { useEffect, useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { studyApi } from "./review.api";

// Nhắc ôn qua email: mặc định tắt, người dùng tự bật; có thể đặt ngày thi để thư có đếm ngược.
export function ReminderCard() {
  const toast = useToast();
  const { data, reload } = useApi(() => studyApi.reminder(), []);
  const [enabled, setEnabled] = useState(false);
  const [examDate, setExamDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setEnabled(data.enabled);
    setExamDate(data.examDate ?? "");
  }, [data]);

  if (!data) return null;
  const dirty = enabled !== data.enabled || examDate !== (data.examDate ?? "");

  const save = async () => {
    setSaving(true);
    try {
      await studyApi.setReminder(enabled, examDate || null);
      toast.success(enabled ? "Đã bật nhắc ôn qua email" : "Đã lưu cài đặt nhắc ôn");
      reload();
    } catch (err) {
      toast.error(errorMessage(err, "Chưa lưu được cài đặt"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Nhắc ôn qua email" />
      <div className="space-y-4 p-5">
        <p className="md-body-medium flex items-start gap-2 text-on-surface-variant">
          <BellRing size={18} className="mt-0.5 shrink-0" />
          <span>Mỗi chiều bạn nhận tối đa 1 thư khi có câu đến hạn ôn trong Sổ câu sai và hôm nay bạn chưa học. Thư nào cũng có liên kết hủy.</span>
        </p>
        {!data.emailVerified && <p className="rounded-m3-md bg-warning-container px-4 py-3 text-sm text-on-warning-container">Bạn cần xác minh email trước khi bật nhắc ôn.</p>}
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} disabled={!data.emailVerified && !data.enabled} className="h-5 w-5 accent-[var(--md-sys-color-primary,#1a56db)]" />
          <span className="md-title-small text-on-surface">Gửi email nhắc ôn cho tôi</span>
        </label>
        <label className="block max-w-xs">
          <span className="md-label-large text-on-surface-variant">Ngày thi của tôi (không bắt buộc)</span>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="mt-1 h-11 w-full rounded-m3-md border border-outline-variant bg-surface-container-lowest px-3 text-sm outline-none focus:border-primary"
          />
          <span className="md-body-small text-on-surface-variant">Có ngày thi thì thư sẽ ghi “còn N ngày”.</span>
        </label>
        <Button variant="primary" onClick={() => void save()} disabled={!dirty || saving}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          Lưu
        </Button>
      </div>
    </Card>
  );
}
