import { useRef, useState, type FormEvent } from "react";
import { ExternalLink } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { FormError } from "@/shared/ui/Feedback";
import { Badge } from "@/shared/ui/Badge";
import { formatCredit } from "@/shared/utils/formatters";
import { courseraApi, type CourseraCourse, type LookedUpCourse } from "./coursera.api";

// Dán link Coursera -> kiểm tra -> người dùng tự bấm "Dùng khóa này" mới mở form đặt đơn
export function LinkLookup({ onSelect }: { onSelect: (course: CourseraCourse) => void }) {
  const [link, setLink] = useState("");
  const [result, setResult] = useState<LookedUpCourse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  async function check(event: FormEvent) {
    event.preventDefault();
    const url = link.trim();
    if (submitting.current || !url) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await courseraApi.lookup(url));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const reset = () => {
    setLink("");
    setResult(null);
    setError("");
  };

  const orderable = result !== null && result.isActive && result.price !== undefined;

  return (
    <div className="space-y-4 p-5">
      <form onSubmit={check} className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <Input
            label="Link khóa học Coursera"
            type="text"
            inputMode="url"
            placeholder="https://www.coursera.org/learn/..."
            maxLength={500}
            value={link}
            disabled={busy}
            onChange={(e) => {
              setLink(e.target.value);
              setResult(null);
              setError("");
            }}
          />
        </div>
        <Button type="submit" variant="primary" disabled={busy || !link.trim()} className="sm:mt-2">
          {busy ? "Đang kiểm tra…" : "Kiểm tra"}
        </Button>
      </form>

      <FormError message={error} />

      {result && (
        <div role="status" className="space-y-3 rounded-m3-md border border-outline-variant p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">{result.kind === "specialization" ? "Chuỗi chuyên ngành" : "Khóa học"}</Badge>
            {result.code && <Badge>{result.code}</Badge>}
            <span className="md-label-large ml-auto tabular-nums">{result.price === undefined ? "Chưa có giá" : formatCredit(result.price)}</span>
          </div>
          <p className="md-title-medium break-words text-on-surface">{result.title}</p>
          {result.url && (
            <a href={result.url} target="_blank" rel="noreferrer" className="md-body-medium inline-flex items-center gap-1 text-primary hover:underline">
              Mở trên Coursera <ExternalLink size={16} aria-hidden />
            </a>
          )}
          {!orderable && <p className="md-body-medium text-error">Khóa này hiện chưa nhận đơn.</p>}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" onClick={reset}>
              Nhập link khác
            </Button>
            <Button type="button" variant="primary" disabled={!orderable} onClick={() => onSelect(result)}>
              Dùng khóa này
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
