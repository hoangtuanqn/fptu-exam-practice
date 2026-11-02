import { useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, FolderOpen, Keyboard, ListChecks } from "lucide-react";
import { brand } from "../../config/brand";
import { readDroppedFolder } from "../../utils/readDroppedFolder";
import { FolderInput, type PickFolder } from "../layout/FolderInput";
import { Footer } from "../layout/Footer";

const FEATURES = [
  {
    icon: ListChecks,
    title: "Luyện tập hoặc thi thử",
    text: "Luyện tập: xác nhận từng câu và xem đúng sai ngay. Thi thử: làm hết rồi mới chấm.",
  },
  {
    icon: BarChart3,
    title: "Chấm điểm thang 10",
    text: "Tự tính điểm từng câu theo đáp án của bạn, kèm thời gian làm bài.",
  },
  {
    icon: Keyboard,
    title: "Làm bài nhanh bằng phím",
    text: "Phím A–H chọn đáp án, ←/→ chuyển câu, bấm vào ảnh để phóng to đúng chỗ cần xem.",
  },
];

const FOLDER_EXAMPLE = [
  "ten-de/",
  "├─ 1.webp      câu 1",
  "├─ 2.webp      câu 2",
  "└─ ans.txt     dòng N = đáp án câu N",
  "               (nhiều đáp án: A C D)",
].join("\n");

interface Props {
  onPick: PickFolder;
  userName?: string; // đã đăng nhập thì chào tên, ẩn lời mời đăng ký
  trialUsed: boolean; // khách đã dùng hết lượt thử
}

// Trang chủ: tiêu đề + vùng thả thư mục (hành động chính) + điểm nổi bật + lời mời đăng ký cho khách
export function Landing({ onPick, userName, trialUsed }: Props) {
  const [dragging, setDragging] = useState(false);
  const isGuest = !userName;

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = await readDroppedFolder(e.dataTransfer);
    if (dropped) onPick(dropped.files, dropped.name);
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="relative flex-1 overflow-hidden">
        {/* Quầng sáng xanh rất nhẹ lấy từ gradient của logo */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[48rem] -translate-x-1/2 rounded-full bg-brand-200/50 blur-3xl" />

        <div className="relative mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
          <div className="text-center">
            {isGuest && (
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-medium ${
                  trialUsed
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-brand-200 bg-white text-brand-800"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${trialUsed ? "bg-amber-500" : "bg-accent"}`} />
                {trialUsed ? "Bạn đã dùng hết lượt thử miễn phí" : "Dùng thử miễn phí 1 lần, không cần đăng ký"}
              </span>
            )}
            <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              {userName ? `Chào ${userName}, vào luyện thôi` : brand.product}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-base text-slate-600">
              Chọn thư mục đề trên máy, làm bài và nhận điểm thang 10 ngay. Ảnh đề không bị tải lên đâu cả.
            </p>
          </div>

          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`mt-8 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-6 py-12 text-center shadow-sm transition ${
              dragging
                ? "border-brand-600 bg-brand-50"
                : "border-brand-300 bg-white hover:border-brand-500 hover:bg-brand-50/50"
            }`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-900 text-white">
              <FolderOpen size={22} />
            </span>
            <div className="mt-4 font-serif text-2xl font-semibold text-slate-900">Mở thư mục đề</div>
            <div className="mt-1 text-sm text-slate-500">Kéo thả thư mục vào đây, hoặc bấm để chọn</div>
            <FolderInput onPick={onPick} />
          </label>

          <details className="mt-3 rounded-xl border border-slate-200 bg-white text-sm">
            <summary className="cursor-pointer select-none px-4 py-2.5 text-slate-600 hover:text-slate-900">
              Thư mục đề cần có cấu trúc thế nào?
            </summary>
            <pre className="overflow-x-auto border-t border-slate-100 px-5 py-4 font-mono text-[13px] leading-relaxed text-slate-600">
              {FOLDER_EXAMPLE}
            </pre>
          </details>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-white p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Icon size={18} />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{text}</p>
              </div>
            ))}
          </div>

          {isGuest && (
            <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl bg-brand-900 p-6 text-white sm:flex-row sm:items-center">
              <div>
                <div className="font-serif text-xl font-semibold">Thích rồi? Tạo tài khoản để luyện không giới hạn</div>
                <p className="mt-1 text-sm text-brand-200">
                  Miễn phí, chỉ cần email. Đã có tài khoản thì đăng nhập và dùng tiếp.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-brand-900 transition hover:bg-brand-50"
                >
                  Đăng ký
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-lg border border-white/30 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Đăng nhập
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
