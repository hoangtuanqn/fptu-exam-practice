/**
 * Nón ông già Noel cho Cóc Pass (SVG thuần, không phụ thuộc gì): dùng ở mascot-art.ts, ToadArt và script sinh ảnh ở backend.
 * (x, y) là tâm mép dưới vành lông trong hệ toạ độ của nơi gọi; rotate tính bằng độ (dương = nghiêng sang phải, chóp rủ về phải).
 * Không dùng id/gradient nên chèn nhiều lần trong cùng trang không bị trùng id.
 */
const OUT = "#9a5f00"; // viền nâu như con cóc
const FUR_OUT = "#7a4b00";
const r = (n: number) => Number(n.toFixed(2));

export function santaHat(x: number, y: number, scale = 1, rotate = 0): string {
  // nét viền giữ cùng độ dày với hình cóc dù nón được thu nhỏ
  const body = r(1.8 / scale);
  const fur = r(1.3 / scale);
  return (
    `<g transform="translate(${r(x)} ${r(y)}) rotate(${r(rotate)}) scale(${r(scale)})" stroke-linejoin="round" stroke-linecap="round">` +
    // thân nón đỏ, chóp rủ sang phải
    `<path d="M-20 -6C-18 -20 -6 -30 8 -30C20 -30 28 -24 32 -14C26 -18 18 -18 14 -14C16 -11 18 -8 20 -6Z" fill="#d62828" stroke="${OUT}" stroke-width="${body}"/>` +
    `<path d="M-6 -13C-4 -20 2 -24 9 -25" fill="none" stroke="#ff8a80" stroke-width="${r(2.4 / scale)}" opacity=".6"/>` +
    `<path d="M14 -14C17 -17 22 -19 27 -18" fill="none" stroke="#9b1414" stroke-width="${fur}" opacity=".7"/>` +
    // vành lông trắng
    `<rect x="-23" y="-9" width="46" height="10" rx="5" fill="#ffffff" stroke="${FUR_OUT}" stroke-width="${fur}"/>` +
    `<path d="M-15 -4H-11M-3 -5H1M9 -4H13" fill="none" stroke="#d9dde3" stroke-width="${r(1.6 / scale)}"/>` +
    // quả bông ở chóp
    `<circle cx="33" cy="-13" r="5.5" fill="#ffffff" stroke="${FUR_OUT}" stroke-width="${fur}"/>` +
    `<circle cx="31.4" cy="-14.6" r="1.6" fill="#eef1f5"/>` +
    `</g>`
  );
}
