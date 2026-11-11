import { useState } from "react";
import { Loader2 } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { inputClass } from "@/shared/ui/Input";

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

export default function LibrarySettingsPage() {
  return (
    <>
      <PageHeader title="Kỳ học của môn" description="Gán môn vào Kỳ 0 đến Kỳ 9 để trang Kho đề lọc theo kỳ. Môn chưa gán nằm ở “Chưa phân loại”." />
      <div className="space-y-6">
        <SemesterTool />
      </div>
    </>
  );
}
