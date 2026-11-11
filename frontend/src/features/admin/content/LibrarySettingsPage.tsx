import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { adminApi, type LibrarySettings } from "@/features/admin/api/admin.api";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { ErrorBox, FormError, Loading } from "@/shared/ui/Feedback";
import { Field, Input, inputClass } from "@/shared/ui/Input";

function SettingsForm({ initial, onSaved }: { initial: LibrarySettings; onSaved: () => void }) {
  const toast = useToast();
  const { run, loading, error } = useSubmit();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [rule, setRule] = useState(initial.freeRuleEnabled);
  const [paid, setPaid] = useState(String(initial.newestTermsPaid));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await adminApi.saveLibrarySettings({ enabled, freeRuleEnabled: rule, newestTermsPaid: Number(paid || 0) });
      toast.success("Đã lưu cấu hình thư viện đề");
      onSaved();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormError message={error} />
      <Card>
        <CardHeader title="Đề miễn phí" description="Đề đã có sẵn đáp án của các kỳ thi cũ được mở miễn phí cho thành viên. Kỳ thi mới nhất và đề phải lấy từ FuOverflow vẫn tính phí như cũ. Số liệu thư viện được đệm vài phút nên thay đổi có thể chậm một chút." />
        <div className="space-y-4 p-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 h-4 w-4" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <span className="text-sm">
              <b className="text-slate-800">Bật đề miễn phí của thư viện</b>
              <span className="block text-xs text-slate-500">Tắt là mọi đề tính phí như trước (kể cả đề đã đặt “luôn miễn phí”).</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 h-4 w-4" checked={rule} onChange={(e) => setRule(e.target.checked)} />
            <span className="text-sm">
              <b className="text-slate-800">Tự động miễn phí đề của các kỳ thi cũ</b>
              <span className="block text-xs text-slate-500">Tắt là chỉ những đề bạn đặt “luôn miễn phí” mới miễn phí.</span>
            </span>
          </label>
          <div className="max-w-xs">
            <Input label="Số kỳ thi mới nhất vẫn tính phí" inputMode="numeric" value={paid} onChange={(e) => setPaid(e.target.value.replace(/\D/g, "").slice(0, 2))} hint="Ví dụ 2: hai kỳ thi gần nhất trong kho (SU26, FA25...) tính phí, kỳ cũ hơn miễn phí." />
          </div>
        </div>
      </Card>
      <Button variant="primary" type="submit" disabled={loading}>
        {loading && <Loader2 size={16} className="animate-spin" />}
        Lưu cấu hình
      </Button>
    </form>
  );
}

// Dán nhiều dòng "MÃ,KỲ" (vd PRF192,1). Kỳ để trống = chưa phân loại. Áp dụng lần lượt từng môn và báo môn nào lỗi.
function SemesterTool() {
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);

  const apply = async () => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const bad: string[] = [];
    let ok = 0;
    setBusy(true);
    for (const line of lines) {
      const [code = "", sem = ""] = line.split(/[,\s;]+/);
      const semester = sem === "" ? null : Number(sem);
      if (!code || (semester !== null && !(Number.isInteger(semester) && semester >= 0 && semester <= 9))) {
        bad.push(`${line}: sai định dạng`);
        continue;
      }
      try {
        await adminApi.setSubjectSemester(code, semester);
        ok++;
      } catch (err) {
        bad.push(`${code}: ${errorMessage(err, "lỗi")}`);
      }
    }
    setBusy(false);
    setFailed(bad);
    if (ok > 0) toast.success(`Đã cập nhật ${ok} môn`);
    if (bad.length === 0) setText("");
  };

  return (
    <Card>
      <CardHeader title="Gán kỳ học cho môn" description="Mỗi dòng một môn: mã môn, dấu phẩy, kỳ từ 0 đến 9 (bỏ trống kỳ = chưa phân loại). Môn phải đã có trong hệ thống. Với danh sách lớn, dùng tập lệnh nhập trên máy chủ." />
      <div className="space-y-3 p-5">
        <textarea className={`${inputClass()} h-40 py-3 font-mono`} placeholder={"PRF192,1\nMAD101,2\nSSL101c,"} value={text} onChange={(e) => setText(e.target.value)} />
        {failed.length > 0 && (
          <ul className="max-h-40 overflow-y-auto rounded-m3-md bg-error-container px-4 py-3 text-sm text-on-error-container">
            {failed.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}
        <Button variant="primary" onClick={() => void apply()} disabled={busy || !text.trim()}>
          {busy && <Loader2 size={16} className="animate-spin" />}
          Áp dụng
        </Button>
      </div>
    </Card>
  );
}

// Đặt cờ miễn phí cho TẤT CẢ đề của một môn (ghi đè quy tắc tự động); "theo quy tắc" xóa ghi đè
function SubjectFreeTool() {
  const toast = useToast();
  const [code, setCode] = useState("");
  const [mode, setMode] = useState("free");
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    setBusy(true);
    try {
      const r = await adminApi.setSubjectFree(code.trim(), mode === "free" ? true : mode === "paid" ? false : null);
      toast.success(`Đã cập nhật ${r.updated} đề của môn ${r.code}`);
    } catch (err) {
      toast.error(errorMessage(err, "Chưa cập nhật được"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Ghi đè miễn phí theo môn" description="Đặt luôn miễn phí, luôn tính phí hoặc trả về theo quy tắc cho mọi đề của một môn." />
      <div className="flex flex-wrap items-end gap-3 p-5">
        <div className="w-40">
          <Input label="Mã môn" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="PRF192" />
        </div>
        <div className="w-56">
          <Field label="Cách tính">
            <select className={inputClass()} value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="free">Luôn miễn phí</option>
              <option value="paid">Luôn tính phí</option>
              <option value="rule">Theo quy tắc tự động</option>
            </select>
          </Field>
        </div>
        <Button variant="primary" onClick={() => void apply()} disabled={busy || !code.trim()}>
          {busy && <Loader2 size={16} className="animate-spin" />}
          Áp dụng
        </Button>
      </div>
    </Card>
  );
}

export default function LibrarySettingsPage() {
  const settings = useApi(() => adminApi.librarySettings(), []);
  return (
    <>
      <PageHeader title="Thư viện đề thi" description="Cấu hình trang Kho đề công khai: đề nào miễn phí, và môn thuộc kỳ nào." />
      <div className="space-y-6">
        {settings.data ? (
          <SettingsForm key={JSON.stringify(settings.data)} initial={settings.data} onSaved={settings.reload} />
        ) : settings.loading ? (
          <Loading />
        ) : (
          <ErrorBox message={settings.error ?? "Không tải được cấu hình"} onRetry={settings.reload} />
        )}
        <SemesterTool />
        <SubjectFreeTool />
      </div>
    </>
  );
}
