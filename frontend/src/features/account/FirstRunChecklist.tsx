import { Link } from "react-router-dom";
import { Check, Circle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { examLibraryApi } from "@/features/exam-store/exam-library.api";
import { historyApi } from "@/features/history/history.api";
import { useAuth } from "@/features/auth/AuthContext";
import { useApi } from "@/shared/hooks/useApi";
import { useUpsell } from "@/shared/hooks/useUpsell";
import { trackPrompt } from "@/shared/utils/trackPrompt";

const DISMISS_KEY = "first_run_dismissed";
const SHOWN_KEY = "first_run_shown";

const read = (store: Storage, key: string) => {
  try {
    return store.getItem(key) === "1";
  } catch {
    return false;
  }
};
const write = (store: Storage, key: string) => {
  try {
    store.setItem(key, "1");
  } catch {
    /* ignore */
  }
};

// Danh sách "Bắt đầu" cho người mới, ở trang chủ ngay dưới ô nhập đề. Bốn bước chính là đường kích hoạt thật:
// đăng ký (đã xong sẵn) -> xác minh email -> lấy đề đầu tiên -> nộp bài đầu tiên. Tự ẩn khi đã nộp bài, hoặc khi người dùng bấm X.
export function FirstRunChecklist() {
  const { user } = useAuth();
  const { flags } = useUpsell();
  const [dismissed, setDismissed] = useState(() => read(localStorage, DISMISS_KEY));
  const eligible = !!user && user.role === "USER" && flags.firstRun && !dismissed;
  const library = useApi(() => (eligible ? examLibraryApi.list(1, 1) : Promise.resolve(null)), [eligible]).data;
  const attempts = useApi(() => (eligible ? historyApi.list(1, 1) : Promise.resolve(null)), [eligible]).data;
  const loaded = !!library && !!attempts;
  const submitted = (attempts?.meta.total ?? 0) > 0;
  const visible = eligible && loaded && !submitted;

  useEffect(() => {
    if (!visible || read(sessionStorage, SHOWN_KEY)) return;
    write(sessionStorage, SHOWN_KEY); // one "shown" per session
    trackPrompt("first-run", "shown");
  }, [visible]);

  if (!visible || !user) return null;

  const hasExam = (library?.meta.total ?? 0) > 0;
  const steps = [
    { label: "Tạo tài khoản", done: true },
    { label: "Xác minh email", done: !!user.emailVerifiedAt, to: "/account/profile", action: "Xác minh" },
    { label: "Lấy đề đầu tiên", done: hasExam, to: "/account/exams", action: "Chọn từ Kho đề" },
    { label: "Nộp bài đầu tiên", done: false, to: hasExam ? "/account/exams" : undefined, action: "Vào làm bài" },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <section aria-label="Bắt đầu" className="relative mx-auto mt-6 max-w-xl rounded-m3-md border border-outline-variant bg-surface-container-low p-4 text-left">
      <button
        type="button"
        onClick={() => {
          write(localStorage, DISMISS_KEY);
          trackPrompt("first-run", "dismiss");
          setDismissed(true);
        }}
        aria-label="Ẩn danh sách này"
        className="absolute right-2 top-2 rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container-high"
      >
        <X size={16} />
      </button>
      <h2 className="md-title-small pr-8 text-on-surface">
        Bắt đầu nhanh · {doneCount}/{steps.length} bước
      </h2>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-highest" aria-hidden>
        <div className="h-full rounded-full bg-primary" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ul className="mt-3 space-y-2">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-3">
            {s.done ? <Check size={18} className="shrink-0 text-success" /> : <Circle size={18} className="shrink-0 text-outline" />}
            <span className={`md-body-medium min-w-0 flex-1 ${s.done ? "text-on-surface-variant line-through" : "text-on-surface"}`}>{s.label}</span>
            {!s.done && s.to && (
              <Link to={s.to} onClick={() => trackPrompt("first-run", "click")} className="md-label-large shrink-0 text-primary underline-offset-4 hover:underline">
                {s.action}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
