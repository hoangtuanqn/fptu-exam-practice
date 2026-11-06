import { useEffect, useState } from "react";
import { Check, ChevronRight, Copy, Download, Puzzle } from "lucide-react";
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
      <a href={brand.extensionUrl} download className="mt-1.5 inline-flex items-center gap-2 rounded-md bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">
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
function useExtensionInstalled() {
  const [installed, setInstalled] = useState(() => !!document.documentElement.dataset.fepassExt);
  useEffect(() => {
    const root = document.documentElement;
    const check = () => setInstalled(!!root.dataset.fepassExt);
    check();
    const mo = new MutationObserver(check);
    mo.observe(root, { attributes: true, attributeFilter: ["data-fepass-ext"] });
    return () => mo.disconnect();
  }, []);
  return installed;
}

export function ExtensionBar() {
  const [open, setOpen] = useState(false);
  const installed = useExtensionInstalled();
  if (installed) return null; // đã cài rồi: bỏ dòng nhắc

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group flex w-full shrink-0 items-center justify-center gap-2 border-b border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-50 px-4 py-2 text-sm text-amber-950 transition hover:from-amber-100 hover:to-amber-100"
      >
        <Puzzle size={16} className="shrink-0 text-amber-600" />
        <span className="min-w-0 truncate">
          <b>Cài tiện ích Chrome</b> để làm đề ngay trên FuOverflow
        </span>
        <span className="hidden shrink-0 items-center gap-0.5 font-semibold text-brand-700 sm:inline-flex">
          Xem hướng dẫn <ChevronRight size={15} className="transition group-hover:translate-x-0.5" />
        </span>
      </button>

      {open && (
        <Modal wide onClose={() => setOpen(false)}>
          <ModalTitle icon={Puzzle}>Cài tiện ích FePass cho Chrome</ModalTitle>
          <p className="mt-2 text-sm text-slate-600">
            Tích hợp thẳng vào FuOverflow: bài “Đề Thi FE” có nút <b>Làm đề</b>, bài “Đề Thi PE” có nút <b>Tải đề PE</b>. Thấy giá trước khi bấm, xác nhận mới bị trừ credit. Cài một lần, mất khoảng 1 phút.
          </p>

          <ol className="mt-5 space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-900 text-sm font-semibold text-white">{i + 1}</span>
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
