import { XmasTree } from "@/shared/season/XmasArt";

// Một quả châu treo trên sợi dây mảnh (đặt ở góc trên hero)
function Bauble({ length, tone, className }: { length: number; tone: "red" | "green" | "gold"; className: string }) {
  return (
    <svg viewBox={`0 0 20 ${length + 18}`} width="20" height={length + 18} aria-hidden className={`pointer-events-none absolute top-0 ${className}`}>
      <path d={`M10 0V${length}`} className="xmas-wire" strokeWidth="1" />
      <rect x="7.5" y={length} width="5" height="3.5" rx="1" className="xmas-cap" />
      <circle cx="10" cy={length + 10.5} r="7" className={`xmas-bulb-${tone}`} />
      <circle cx="7.6" cy={length + 8} r="2" className="xmas-bulb-shine" />
    </svg>
  );
}

// Cây thông trên gò tuyết
function TreeOnMound({ className, treeClass }: { className: string; treeClass: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute hidden flex-col items-center lg:flex ${className}`}>
      <XmasTree className={`relative z-[1] w-auto ${treeClass}`} />
      <div className="xmas-mound -mt-3 h-6 w-[130%] rounded-[50%]" />
    </div>
  );
}

// Mùa Giáng sinh ở hero trang chủ: dải ruy băng đỏ-xanh mảnh ở mép trên (chuỗi đèn đã có ở đáy header ngay trên),
// quả châu treo ở hai góc trên, hai cây thông trên gò tuyết ở hai mép (chỉ từ 1024px: nằm trong lề ngoài cột nội dung 768px nên không che
// tiêu đề / ô chọn môn), dải đồi tuyết ở mép dưới. Tất cả nằm tuyệt đối: không đẩy bố cục, không nhận thao tác.
export function XmasRibbon() {
  return (
    <>
      <div aria-hidden className="xmas-ribbon pointer-events-none absolute inset-x-0 top-0 h-1" />
      <div aria-hidden className="hidden lg:block">
        <Bauble length={26} tone="red" className="left-[4%]" />
        <Bauble length={48} tone="gold" className="left-[9%]" />
        <Bauble length={34} tone="green" className="right-[5%]" />
        <Bauble length={56} tone="red" className="right-[10%]" />
      </div>
      <TreeOnMound className="left-3 top-24 xl:left-10 xl:top-20" treeClass="h-32 xl:h-56" />
      <TreeOnMound className="right-3 top-28 xl:right-10 xl:top-24" treeClass="h-28 xl:h-52" />
      <div aria-hidden className="xmas-snowhill pointer-events-none absolute inset-x-0 bottom-0 h-5" />
    </>
  );
}

// Lời chúc phía trên tiêu đề, nằm TUYỆT ĐỐI (không đẩy bố cục khi cờ mùa về sau lần vẽ đầu):
// khách: đè đúng chỗ dòng tên sản phẩm (dòng đó được ẩn nhưng giữ chỗ); thành viên: nằm trong khoảng đệm trên sẵn có (48/64px).
// Chữ màu thường (không dùng đỏ/xanh cho chữ), điểm nhấn đỏ ở viền và chấm; luôn một dòng, chữ nhỏ hơn trên điện thoại.
export function XmasGreeting({ guest }: { guest: boolean }) {
  return (
    <div className={`pointer-events-none absolute inset-x-0 flex justify-center px-4 ${guest ? "top-4 sm:top-6" : "top-3 sm:top-5"}`}>
      <p className="xmas-greeting inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full border-2 bg-surface-container-lowest px-3 text-xs font-medium text-on-surface sm:gap-2 sm:text-sm">
        <XmasTree className="h-4 w-auto shrink-0" />
        Chúc mừng Giáng sinh, ôn thi thật vui nhé
        <span aria-hidden className="xmas-dot hidden h-2 w-2 shrink-0 rounded-full sm:block" />
      </p>
    </div>
  );
}
