import { useEffect, useState } from "react";
import { Check, ChevronRight, Copy, Download, Puzzle, RefreshCw } from "lucide-react";
import { brand } from "@/shared/brand/brand";
import { Modal, ModalTitle } from "@/shared/ui/Modal";

const EXT_PAGE = "chrome://extensions";

function CopyChip({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-700 hover:border-brand-400"
    >
      {text} {done ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
    </button>
  );
}

const STEPS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Tải tiện ích về máy",
    body: (
      <a href={brand.extensionUrl} download className="mt-1.5 inline-flex items-center gap-2 rounded-md bg-primary-container px-4 py-2 text-sm font-semibold text-on-primary-container hover:bg-primary-container/80">
        <Download size={15} /> Tải file fepass_extension.zip
      </a>
    ),
  },
  { title: "Giải nén file zip", body: <p className="text-sm text-slate-600">Chuột phải vào file vừa tải, chọn “Giải nén” (Extract). Giữ thư mục này, đừng xóa.</p> },
  {
    title: "Mở trang quản lý tiện ích của Chrome",
    body: (
      <p className="text-sm text-slate-600">
        Dán <CopyChip text={EXT_PAGE} /> vào thanh địa chỉ rồi Enter.
      </p>
    ),
  },
  { title: "Bật “Chế độ cho nhà phát triển”", body: <p className="text-sm text-slate-600">Gạt công tắc Developer mode ở góc trên bên phải của trang đó.</p> },
  { title: "Bấm “Tải tiện ích đã giải nén”", body: <p className="text-sm text-slate-600">Nút Load unpacked ở góc trên bên trái, rồi chọn thư mục vừa giải nén ở bước 2.</p> },
  { title: "Đăng nhập fepass.top và dùng thử", body: <p className="text-sm text-slate-600">Đăng nhập trang này, sau đó vào một chuyên mục FuOverflow: bài “Đề Thi FE” có nút “Làm đề”, bài “Đề Thi PE” có nút “Tải đề PE”.</p> },
];

// Thanh nhỏ nằm trước mắt người dùng ở đầu trang chủ; bấm vào mở hộp hướng dẫn cài tiện ích Chrome
// Tiện ích đã cài thì content script của nó đặt data-fepass-ext lên thẻ <html> (có thể xuất hiện sau khi trang vẽ xong nên có theo dõi)
function useExtensionVersion() {
  const [installed, setInstalled] = useState(() => document.documentElement.dataset.fepassExt ?? "");
  useEffect(() => {
    const root = document.documentElement;
    const check = () => setInstalled(root.dataset.fepassExt ?? "");
    check();
    const mo = new MutationObserver(check);
    mo.observe(root, { attributes: true, attributeFilter: ["data-fepass-ext"] });
    return () => mo.disconnect();
  }, []);
  return installed;
}

const newer = (a: string, b: string) => {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return false;
};

// Phiên bản mới nhất (file công khai trên website), lấy mỗi lần vào trang để so với bản đã cài
function useLatestVersion(enabled: boolean) {
  const [latest, setLatest] = useState("");
  useEffect(() => {
    if (!enabled) return;
    fetch("/extension-version.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { version?: string } | null) => setLatest(typeof j?.version === "string" ? j.version : ""))
      .catch(() => undefined);
  }, [enabled]);
  return latest;
}

const UPDATE_STEPS: { title: string; body: React.ReactNode }[] = [
  STEPS[0]!,
  { title: "Giải nén đè lên thư mục cũ", body: <p className="text-sm text-slate-600">Giải nén vào đúng thư mục bạn đã cài tiện ích trước đây, chọn “Thay thế tất cả” (Replace).</p> },
  {
    title: "Tải lại tiện ích trong Chrome",
    body: (
      <p className="text-sm text-slate-600">
        Dán <CopyChip text={EXT_PAGE} /> vào thanh địa chỉ, tìm FePass rồi bấm nút tải lại (⟳). Sau đó tải lại trang này.
      </p>
    ),
  },
];

export function ExtensionBar() {
  const [open, setOpen] = useState(false);
  const version = useExtensionVersion();
  const latest = useLatestVersion(!!version);
  const outdated = !!version && !!latest && newer(latest, version);
  if (version && !outdated) return null; // đã cài và là bản mới nhất: bỏ dòng nhắc

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md-state md-motion md-body-medium group flex min-h-12 w-full shrink-0 items-center justify-center gap-2 border-b border-outline-variant bg-gradient-to-r from-surface-container-high via-primary-container/50 to-surface-container-high px-4 py-2 text-on-surface"
      >
        {outdated ? <RefreshCw size={16} className="shrink-0 text-primary" /> : <Puzzle size={16} className="shrink-0 text-primary" />}
        <span className="min-w-0 truncate">
          {outdated ? (
            <>
              <b>Tiện ích Chrome của bạn đã cũ</b> (đang dùng {version}, mới nhất {latest})
            </>
          ) : (
            <>
              <b>Cài tiện ích Chrome</b> để làm đề ngay trên FuOverflow
            </>
          )}
        </span>
        <span className="hidden shrink-0 items-center gap-0.5 font-semibold text-primary sm:inline-flex">
          {outdated ? "Cập nhật ngay" : "Xem hướng dẫn"} <ChevronRight size={15} className="transition group-hover:translate-x-0.5" />
        </span>
      </button>

      {open && (
        <Modal wide onClose={() => setOpen(false)}>
          <ModalTitle icon={outdated ? RefreshCw : Puzzle}>{outdated ? `Cập nhật tiện ích lên ${latest}` : "Cài tiện ích FePass cho Chrome"}</ModalTitle>
          <p className="mt-2 text-sm text-slate-600">
            Tích hợp thẳng vào FuOverflow: bài “Đề Thi FE” có nút <b>Làm đề</b>, bài “Đề Thi PE” có nút <b>Tải đề PE</b>. Thấy giá trước khi bấm, xác nhận mới bị trừ credit. Cài một lần, mất khoảng 1 phút.
          </p>

          <ol className="mt-5 space-y-4">
            {(outdated ? UPDATE_STEPS : STEPS).map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary">{i + 1}</span>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900">{s.title}</div>
                  {s.body}
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-5 rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">Tiện ích chỉ chạy trên fuoverflow.com và không lưu mật khẩu của bạn. Chrome có thể nhắc “tắt tiện ích chế độ nhà phát triển” mỗi lần mở: cứ bấm bỏ qua.</p>
          <div className="mt-4 flex justify-end">
            <button onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Đóng
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
