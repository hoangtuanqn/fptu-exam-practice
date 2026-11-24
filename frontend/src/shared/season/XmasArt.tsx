import { useLocation } from "react-router-dom";
import { xmasTree } from "@/shared/ui/xmas-tree";
import { useSeason } from "./SeasonContext";

// Đồ trang trí Giáng sinh dùng chung. Tất cả chỉ để nhìn (aria-hidden, không nhận thao tác); nơi gọi tự kiểm useSeason().showDecor.

const TREE_SVG = xmasTree(0, 0, 1);

/** Cây thông nhỏ (hình ở shared/ui/xmas-tree.ts). Đặt cỡ bằng className, ví dụ "h-10 w-auto" */
export function XmasTree({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="-27 -62 54 63"
      width="54"
      height="63"
      aria-hidden
      className={`pointer-events-none select-none ${className}`}
      dangerouslySetInnerHTML={{ __html: TREE_SVG }}
    />
  );
}

/** Hộp quà nhỏ, màu lấy từ --xmas-* */
export function XmasGift({ className = "", tone = "red" }: { className?: string; tone?: "red" | "green" }) {
  const box = tone === "red" ? "var(--xmas-red)" : "var(--xmas-green)";
  const ribbon = tone === "red" ? "var(--xmas-gold)" : "var(--xmas-snow)";
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden className={`pointer-events-none select-none ${className}`}>
      <rect x="3" y="9" width="18" height="13" rx="1.5" style={{ fill: box }} />
      <rect x="2" y="6.5" width="20" height="4" rx="1" style={{ fill: box }} />
      <rect x="10.5" y="6.5" width="3" height="15.5" style={{ fill: ribbon }} />
      <path d="M12 6.5C9 2 5.5 3.5 7 6.5ZM12 6.5C15 2 18.5 3.5 17 6.5Z" style={{ fill: ribbon }} />
    </svg>
  );
}

// Bóng đèn trong một chu kỳ 128px: dây võng đều giữa các móc, bóng treo ở điểm thấp nhất.
// Mỗi màu một lớp lặp; ba nhóm nhấp nháy lệch pha (a: đỏ + xanh dương, b: xanh lá, c: vàng)
const BULBS = [
  { x: 16, tone: "red", group: "a" },
  { x: 48, tone: "green", group: "b" },
  { x: 80, tone: "gold", group: "c" },
  { x: 112, tone: "blue", group: "a" },
] as const;

/** Chuỗi đèn lặp ngang, cao 13px (dây bắt đầu ở mép trên y=0, bóng ~7x7px). Nhấp nháy bằng opacity (CSS .xmas-twinkle; màn làm đề đứng yên) */
export function XmasLights({ className = "" }: { className?: string }) {
  return (
    <svg width="100%" height="13" aria-hidden className={`block overflow-visible ${className}`}>
      <defs>
        <pattern id="xmas-wire" width="128" height="13" patternUnits="userSpaceOnUse">
          <path d="M0 .5Q16 6 32 .5Q48 6 64 .5Q80 6 96 .5Q112 6 128 .5" className="xmas-wire" fill="none" strokeWidth="1" />
        </pattern>
        {BULBS.map((b) => (
          <pattern key={b.tone} id={`xmas-bulb-${b.tone}`} width="128" height="13" patternUnits="userSpaceOnUse">
            <rect x={b.x - 1.6} y="2.6" width="3.2" height="2.2" rx=".6" className="xmas-cap" />
            <ellipse cx={b.x} cy="8.6" rx="3.6" ry="3.8" className={`xmas-bulb-${b.tone}`} />
            <ellipse cx={b.x - 1.2} cy="7.4" rx="1" ry="1.3" className="xmas-bulb-shine" />
          </pattern>
        ))}
      </defs>
      <rect width="100%" height="13" fill="url(#xmas-wire)" />
      {BULBS.map((b) => (
        <rect key={b.tone} width="100%" height="13" fill={`url(#xmas-bulb-${b.tone})`} className={`xmas-glow-${b.tone} xmas-twinkle xmas-twinkle-${b.group}`} />
      ))}
    </svg>
  );
}

/**
 * Dây đèn treo NGAY DƯỚI mép dưới thanh trên cùng (top: 100% trong header có position): không bao giờ đè logo, menu, ô tìm kiếm
 * hay nút trong header; bóng rủ ~12px xuống dải bên dưới, không nhận thao tác, nằm dưới menu/popup của header.
 * Màn làm đề: nhỏ hơn, đứng yên, nhạt. Không hiện ở quản trị.
 */
export function XmasGarland() {
  const { showDecor } = useSeason();
  const { pathname } = useLocation();
  if (!showDecor || pathname.startsWith("/admin")) return null;
  return (
    <div aria-hidden className="xmas-garland pointer-events-none absolute inset-x-0">
      <XmasLights />
    </div>
  );
}
