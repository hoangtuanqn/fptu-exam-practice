import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { Input } from "@/shared/ui/Input";
import { FormError } from "@/shared/ui/Feedback";
import { formatCredit } from "@/shared/utils/formatters";
import { courseraApi, type CourseraCourse, type LookedUpCourse } from "./coursera.api";

// Chỉ gửi lên server khi trông đã giống link Coursera, tránh tốn lượt kiểm tra khi người dùng còn đang gõ dở
const LOOKS_LIKE_LINK = /^https:\/\/(www\.)?coursera\.org\/\S+/i;

// Dán link Coursera: tự kiểm tra sau khi ngừng gõ; kiểm tra được là chọn luôn khóa đó để mở form đặt đơn
export function LinkLookup({ onSelect }: { onSelect: (course: CourseraCourse) => void }) {
  const [link, setLink] = useState("");
  const url = useDebounce(link.trim(), 600);
  const [result, setResult] = useState<LookedUpCourse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setResult(null);
    setError("");
    if (!LOOKS_LIKE_LINK.test(url)) return;
    let stale = false; // bỏ kết quả của link cũ nếu người dùng đã đổi link
    setBusy(true);
    courseraApi
      .lookup(url)
      .then((course) => {
        if (stale) return;
        if (!course.isActive || course.price === undefined) setError("Khóa này hiện chưa nhận đơn.");
        else {
          setResult(course);
          onSelect(course);
        }
      })
      .catch((err) => !stale && setError(errorMessage(err)))
      .finally(() => !stale && setBusy(false));
    return () => {
      stale = true;
      setBusy(false);
    };
    // onSelect đổi mỗi lần render của trang cha; chỉ link đã debounce mới được kích hoạt kiểm tra
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <div className="space-y-4 p-5">
      <Input
        label="Link khóa học Coursera"
        type="text"
        inputMode="url"
        placeholder="https://www.coursera.org/learn/..."
        maxLength={500}
        value={link}
        onChange={(e) => setLink(e.target.value)}
      />
      {busy && <p className="md-body-small text-on-surface-variant">Đang kiểm tra link…</p>}
      <FormError message={error} />
      {result && (
        <p role="status" className="md-body-medium flex items-start gap-2 text-on-surface">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-success" aria-hidden />
          <span className="min-w-0 break-words">
            <span className="font-medium">{result.title}</span> · {formatCredit(result.price ?? 0)}
          </span>
        </p>
      )}
    </div>
  );
}
