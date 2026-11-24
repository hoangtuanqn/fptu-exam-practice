/**
 * Cây thông Noel cho Cóc Pass ôm (SVG thuần, không phụ thuộc gì): dùng ở mascot-art.ts và script sinh ảnh ở backend.
 * (x, y) là tâm đáy chậu trong hệ toạ độ của nơi gọi, cây cao khoảng 58 đơn vị (scale = 1).
 * Gradient dùng id riêng `xt*`: chèn nhiều lần trong một trang vẫn an toàn vì nội dung giống hệt nhau.
 */
const EDGE = "#0d4020";
const GOLD_OUT = "#a86400";

const bauble = (cx: number, cy: number, fill: string, r = 2.3) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="#5a1010" stroke-width=".6"/><circle cx="${cx - r * 0.35}" cy="${cy - r * 0.4}" r="${r * 0.32}" fill="#fff" opacity=".85"/>`;

export function xmasTree(x: number, y: number, scale = 1): string {
  return (
    `<g transform="translate(${x} ${y}) scale(${scale})" stroke-linejoin="round" stroke-linecap="round">` +
    `<defs><linearGradient id="xtg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4cc46a"/><stop offset="1" stop-color="#17703a"/></linearGradient>` +
    `<linearGradient id="xtp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ef5350"/><stop offset="1" stop-color="#b71c1c"/></linearGradient></defs>` +
    // chậu đỏ viền vàng
    `<path d="M-8 -9H8L6 0H-6Z" fill="url(#xtp)" stroke="#6b1111" stroke-width="1.2"/>` +
    `<rect x="-9.4" y="-11.4" width="18.8" height="3.6" rx="1.6" fill="#ffd23a" stroke="${GOLD_OUT}" stroke-width=".9"/>` +
    // ba tầng cành
    `<path d="M-25 -10Q0 -3 25 -10L0 -31Z" fill="url(#xtg)" stroke="${EDGE}" stroke-width="1.5"/>` +
    `<path d="M-19 -26Q0 -19 19 -26L0 -44Z" fill="url(#xtg)" stroke="${EDGE}" stroke-width="1.5"/>` +
    `<path d="M-13 -40Q0 -34 13 -40L0 -55Z" fill="url(#xtg)" stroke="${EDGE}" stroke-width="1.5"/>` +
    // tuyết đọng trên mép cành
    `<g fill="#fff" stroke="#c9d6e6" stroke-width=".5">` +
    `<path d="M-25 -10Q-17 -7 -12 -9Q-15 -14 -19 -14Z"/><path d="M25 -10Q17 -7 12 -9Q15 -14 19 -14Z"/>` +
    `<path d="M-19 -26Q-12 -23 -8 -25Q-10 -30 -14 -30Z"/><path d="M19 -26Q12 -23 8 -25Q10 -30 14 -30Z"/>` +
    `<path d="M-13 -40Q-7 -37 -4 -39Q-6 -43 -9 -43Z"/><path d="M13 -40Q7 -37 4 -39Q6 -43 9 -43Z"/></g>` +
    // dây đèn vàng lượn qua các tầng
    `<path d="M-14 -14Q-4 -9 4 -14T17 -12" fill="none" stroke="#ffe27a" stroke-width="1.2" stroke-dasharray="1.6 3.2"/>` +
    `<path d="M-10 -31Q-2 -27 4 -31T12 -30" fill="none" stroke="#ffe27a" stroke-width="1.2" stroke-dasharray="1.6 3.2"/>` +
    // bóng trang trí
    bauble(-13, -13, "#e53935") + bauble(8, -17, "#ffd23a") + bauble(16, -12, "#42a5f5", 2) + bauble(-6, -22, "#ffd23a", 2) +
    bauble(-8, -30, "#42a5f5", 2) + bauble(7, -33, "#e53935", 2.1) +
    // ngôi sao đỉnh
    `<path d="M0 -66L2.2 -60.6L8 -60L3.6 -56.2L5 -50.4L0 -53.4L-5 -50.4L-3.6 -56.2L-8 -60L-2.2 -60.6Z" transform="translate(0 6)" fill="#ffe14d" stroke="${GOLD_OUT}" stroke-width="1"/>` +
    `</g>`
  );
}
