import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  ExternalLink,
  Flag,
  FolderOpen,
  Keyboard,
  Library,
  ListChecks,
  QrCode,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { brand, logos } from "@/shared/brand/brand";
import { readDroppedFolder } from "@/features/practice/utils/readDroppedFolder";
import { FolderInput, type PickFolder } from "@/features/practice/components/FolderInput";
import { Footer } from "@/shared/layout/Footer";

const FEATURES = [
  { icon: Library, text: `Kho đề ${brand.partnerName}` },
  { icon: Sparkles, text: "AI giải thích đáp án" },
  { icon: BarChart3, text: "Chấm điểm thang 10" },
];

const STEPS = [
  { title: "Chọn thư mục đề", text: "Kéo thả thư mục ảnh đề và file ans.txt của bạn vào trang." },
  { title: "Làm bài", text: "Luyện tập xem đúng sai từng câu, hoặc thi thử rồi mới chấm." },
  { title: "Nhận điểm thang 10", text: "Điểm tính tự động, kèm thời gian làm bài và câu còn bỏ trống." },
];

const BENEFITS = [
  { icon: ShieldCheck, title: "Đề ở lại trên máy bạn", text: "Ảnh đề được mở ngay trong trình duyệt, không tải lên máy chủ." },
  { icon: ListChecks, title: "Luyện tập hoặc thi thử", text: "Hai chế độ cho hai mục đích: ôn kiến thức và tập phòng thi." },
  { icon: Keyboard, title: "Thao tác như phần mềm thi", text: "Phím A–H chọn đáp án, ←/→ chuyển câu, bấm vào ảnh để phóng to đúng chỗ." },
  { icon: Flag, title: "Đánh dấu câu phân vân", text: "Lưới câu hỏi cho thấy câu nào đã làm, đã đánh dấu, đúng hay sai." },
  { icon: BarChart3, title: "Chấm điểm tức thì", text: "Câu nhiều đáp án chỉ đúng khi chọn đủ và đúng, giống chấm thi thật." },
  { icon: QrCode, title: "Nạp ví bằng QR", text: "Chuyển khoản đúng nội dung, tiền vào ví tự động sau ít phút, có lịch sử đầy đủ." },
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
  userName?: string; // đã đăng nhập thì chào tên, ẩn phần giới thiệu
  trialUsed: boolean; // khách đã dùng hết lượt thử
}

// Tách slogan thành phần thường + phần nhấn (cụm cuối được tô xanh), ví dụ "Hành trình đi đến" + "điểm 10."
function splitSlogan(slogan: string) {
  const m = slogan.match(/^(.*?)(điểm\s*\d+\.?)$/i);
  return m ? [m[1] ?? "", m[2] ?? ""] : [slogan, ""];
}

// Trang chủ: hero (slogan + vùng thả thư mục) và, với khách, các phần giới thiệu dịch vụ. Nền xen kẽ trắng / xanh nhạt.
export function Landing({ onPick, userName, trialUsed }: Props) {
  const [dragging, setDragging] = useState(false);
  const isGuest = !userName;
  const [sloganLead, sloganAccent] = splitSlogan(brand.slogan);

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = await readDroppedFolder(e.dataTransfer);
    if (dropped) onPick(dropped.files, dropped.name);
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-white">
      <section className="bg-white">
        <div className="h-1 bg-gradient-to-r from-brand-600 via-accent to-accent-soft" />
        <div className="mx-auto w-full max-w-2xl px-5 py-8 text-center sm:py-10">
          {isGuest && !trialUsed && (
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Dùng thử miễn phí 1 lần, không cần đăng ký
            </span>
          )}
          <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">
            {userName ? `Chào ${userName}, vào luyện thôi` : brand.product}
          </h1>
          {isGuest && (
            <p className="mt-3 font-serif text-xl font-medium text-brand-600 sm:text-2xl">
              {sloganLead}
              {sloganAccent && <span className="font-semibold text-brand-900">{sloganAccent}</span>}
            </p>
          )}
          <p className="mt-3 text-base font-medium text-slate-800">Luyện đề ngay để nắm chắc 9+ trong tay.</p>
          <p className="mt-2 text-sm text-slate-600">
            Luyện đề thi FE từ kho đề của {brand.partnerName}, làm bài và nhận điểm thang 10 ngay.
          </p>
          <a
            href={brand.partnerUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-xs text-slate-600 transition hover:border-brand-300"
          >
            <img src={logos.partner} alt={brand.partnerName} className="h-6 w-6 rounded-full" />
            Kho đề từ <b className="font-semibold text-slate-800">{brand.partnerName}</b>
          </a>

          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`mt-6 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-6 py-8 transition ${
              dragging ? "border-brand-600 bg-brand-50" : "border-brand-300 bg-brand-50/40 hover:border-brand-500"
            }`}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-accent text-white shadow-md shadow-brand-600/25">
              <FolderOpen size={20} />
            </span>
            <div className="mt-3 font-serif text-xl font-semibold text-slate-900">Mở thư mục đề</div>
            <div className="mt-0.5 text-sm text-slate-500">Kéo thả thư mục vào đây, hoặc bấm để chọn</div>
            <FolderInput onPick={onPick} />
          </label>

          <details className="mt-3 text-left text-sm">
            <summary className="cursor-pointer select-none text-center text-xs text-slate-500 hover:text-slate-800">
              Thư mục đề cần có cấu trúc thế nào?
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs leading-relaxed text-slate-600">
              {FOLDER_EXAMPLE}
            </pre>
          </details>

          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-600">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="inline-flex items-center gap-2">
                <Icon size={16} className="text-brand-600" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {isGuest && (
        <>
          <section className="border-t border-slate-200 bg-paper">
            <div className="mx-auto max-w-4xl px-5 py-12">
              <h2 className="text-center font-serif text-2xl font-semibold text-slate-900 sm:text-3xl">
                Từ thư mục đề đến điểm số trong 3 bước
              </h2>
              <ol className="mt-8 grid gap-4 sm:grid-cols-3">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="rounded-xl border border-slate-200 bg-white p-5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-accent font-serif text-sm font-semibold text-white">
                      {i + 1}
                    </span>
                    <h3 className="mt-3 text-sm font-semibold text-slate-900">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">{step.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="bg-white">
            <div className="mx-auto max-w-4xl px-5 py-12">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-3">
                    <img src={logos.partner} alt={brand.partnerName} className="h-11 w-11 rounded-full" />
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-brand-700">
                      Kho đề {brand.partnerName}
                    </span>
                  </div>
                  <h3 className="mt-4 font-serif text-xl font-semibold text-slate-900">
                    Luyện đề thi FE từ kho đề của {brand.partnerName}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Lấy đề từ {brand.partnerName}, mở thư mục đề trên hệ thống và làm ngay như thi thật, có chấm điểm và
                    tính giờ.
                  </p>
                  <a
                    href={brand.partnerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
                  >
                    Xem kho đề <ExternalLink size={14} />
                  </a>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 p-6 text-white">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-accent">
                    <Sparkles size={20} />
                  </span>
                  <h3 className="mt-4 font-serif text-xl font-semibold">AI giải thích đáp án chi tiết</h3>
                  <p className="mt-2 text-sm leading-relaxed text-brand-100">
                    Làm sai một câu? AI chỉ ra vì sao đáp án đúng là đúng và các phương án còn lại sai ở đâu, để bạn hiểu
                    chứ không chỉ nhớ.
                  </p>
                </div>
              </div>
            </div>
          </section>


          <section className="relative overflow-hidden bg-brand-900 text-white">
            {/* Lưới mờ + ánh sáng xanh/cyan lấy từ gradient của logo */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
                backgroundSize: "36px 36px",
              }}
            />
            <div className="pointer-events-none absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-brand-600/40 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-accent/20 blur-3xl" />

            <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-5 px-5 py-12 text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent">{brand.slogan}</p>
              <h2 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">
                Sẵn sàng chạm{" "}
                <span className="bg-gradient-to-r from-brand-400 via-accent to-accent-soft bg-clip-text text-transparent">điểm 10</span>?
              </h2>
              <p className="max-w-md text-sm text-brand-200">
                Tạo tài khoản miễn phí chỉ với email, luyện đề không giới hạn.
              </p>

              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  to="/register"
                  className="rounded-lg bg-gradient-to-r from-brand-600 to-accent px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:brightness-110"
                >
                  Tạo tài khoản miễn phí
                </Link>
                <Link
                  to="/login"
                  className="rounded-lg border border-white/25 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Đăng nhập
                </Link>
              </div>

              <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-brand-300">
                {["Đăng ký miễn phí", "Chấm điểm thang 10", "AI giải thích đáp án"].map((t) => (
                  <li key={t} className="inline-flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-accent" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}

      <Footer />
    </div>
  );
}
