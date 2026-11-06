/**
 * Hình Cóc Pass (SVG tĩnh, dựng một lần lúc nạp module): đội vòng nguyệt quế, cầm bảng danh hiệu "CÓC PASS".
 * Nằm riêng để Mascot.tsx gọn và để dễ chỉnh hình.
 */
const OUT = "#9a5f00"; // viền
const f = (n: number) => Number(n.toFixed(2));

// Lá nguyệt quế mọc dọc một cung quanh đầu: lá ngoài và lá trong xen kẽ, to dần về phía đỉnh
function laurel(): string {
  const cx = 52;
  const cy = 43;
  const rx = 33;
  const ry = 27;
  const rad = Math.PI / 180;
  const out: string[] = [];
  const leaf = (x: number, y: number, rot: number, s: number, shade: 0 | 1) =>
    `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})">` +
    `<path d="M0 0C3 -4.4 9 -4.4 13 0C9 4.4 3 4.4 0 0Z" fill="url(#lf${shade})" stroke="#7a4b00" stroke-width=".7"/>` +
    `<path d="M1.2 0H10.6" stroke="#7a4b00" stroke-width=".6" stroke-linecap="round" opacity=".7"/></g>`;
  // hai nhánh: trái đi từ 196 độ lên đỉnh (266), phải đi từ 344 độ lên đỉnh (274)
  for (const side of [-1, 1] as const) {
    const a0 = side < 0 ? 196 : 344;
    const a1 = side < 0 ? 266 : 274;
    const N = 7;
    const pts: string[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = (a0 + ((a1 - a0) * i) / 24) * rad;
      pts.push(`${f(cx + rx * Math.cos(a))} ${f(cy + ry * Math.sin(a))}`);
    }
    out.push(`<path d="M${pts.join("L")}" fill="none" stroke="#7a4b00" stroke-width="1.6" stroke-linecap="round"/>`);
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const a = (a0 + (a1 - a0) * t) * rad;
      const x = cx + rx * Math.cos(a);
      const y = cy + ry * Math.sin(a);
      // hướng tiếp tuyến theo chiều đi lên đỉnh
      const dir = Math.sign(a1 - a0);
      const rot = Math.atan2(ry * Math.cos(a) * dir, -rx * Math.sin(a) * dir) / rad;
      const s = 0.78 + 0.3 * t;
      out.push(leaf(x, y, rot - 38, s, 0)); // lá phía ngoài
      out.push(leaf(x, y, rot + 38, s * 0.92, 1)); // lá phía trong
    }
  }
  // nơ đỏ ở đỉnh, nơi hai nhánh gặp nhau
  out.push(
    `<g transform="translate(52 16.5)"><path d="M0 0C-5 -5 -9 -2 -7 2C-5 4 -2 2 0 0Z" fill="#e53935" stroke="#7f1212" stroke-width=".9"/>` +
      `<path d="M0 0C5 -5 9 -2 7 2C5 4 2 2 0 0Z" fill="#e53935" stroke="#7f1212" stroke-width=".9"/>` +
      `<circle r="2.1" fill="#b71c1c" stroke="#7f1212" stroke-width=".9"/></g>`,
  );
  return out.join("");
}

const hand = (x: number, y: number) =>
  `<g stroke="${OUT}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">` +
  `<ellipse cx="${x}" cy="${y}" rx="5.6" ry="4.6" fill="url(#gold)"/>` +
  `<path d="M${x - 2.4} ${y - 1.2}V${y + 1.8}M${x + 0.6} ${y - 1.8}V${y + 2.2}M${x + 3.2} ${y - 1}V${y + 1.6}" fill="none" stroke-width="1"/></g>`;

export const MASCOT_SVG =
  `<svg viewBox="0 0 132 100" width="132" height="100" xmlns="http://www.w3.org/2000/svg" role="presentation">` +
  `<defs>` +
  `<radialGradient id="gold" cx=".42" cy=".28" r=".85"><stop offset="0" stop-color="#fff08a"/><stop offset=".5" stop-color="#ffc61f"/><stop offset="1" stop-color="#e29400"/></radialGradient>` +
  `<linearGradient id="belly" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff9d0"/><stop offset="1" stop-color="#ffe58c"/></linearGradient>` +
  `<linearGradient id="lf0" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#f2b21a"/></linearGradient>` +
  `<linearGradient id="lf1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e0a000"/><stop offset="1" stop-color="#b97800"/></linearGradient>` +
  `<linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a06a22"/><stop offset="1" stop-color="#5f3a0d"/></linearGradient>` +
  `<linearGradient id="plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3a6"/><stop offset=".55" stop-color="#ffd23a"/><stop offset="1" stop-color="#f0a800"/></linearGradient>` +
  `</defs>` +
  // chân sau + bàn chân
  `<g stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">` +
  `<path d="M12 82C8 70 18 58 32 60C44 62 46 78 40 86Z" fill="url(#gold)"/>` +
  `<path d="M3 90C3 85 12 83 20 85L40 86C46 87 46 92 40 92H8C4 92 3 91 3 90Z" fill="url(#gold)"/>` +
  `<path d="M11 91.5V87.5M18 91.5V87" fill="none" stroke-width="1.1"/></g>` +
  // thân + bụng
  `<ellipse cx="54" cy="64" rx="40" ry="27" fill="url(#gold)" stroke="${OUT}" stroke-width="2"/>` +
  `<path d="M34 78C46 90 78 90 90 76C80 70 46 70 34 78Z" fill="url(#belly)" opacity=".95"/>` +
  `<g fill="#e08e00" opacity=".75"><circle cx="22" cy="56" r="3"/><circle cx="31" cy="49" r="2.2"/><circle cx="17" cy="66" r="2.2"/><circle cx="29" cy="60" r="1.7"/><circle cx="40" cy="52" r="1.5"/></g>` +
  `<ellipse cx="38" cy="48" rx="14" ry="5.5" fill="#fff" opacity=".28" transform="rotate(-14 38 48)"/>` +
  // vòng nguyệt quế (nằm sau mắt)
  laurel() +
  // mắt lồi
  `<g stroke="${OUT}" stroke-width="1.8">` +
  `<circle cx="38" cy="38" r="12" fill="url(#gold)"/><circle cx="66" cy="37" r="13.5" fill="url(#gold)"/></g>` +
  `<circle cx="39.5" cy="38.5" r="8" fill="#fff" stroke="${OUT}" stroke-width="1"/><circle cx="67.5" cy="37.5" r="9.3" fill="#fff" stroke="${OUT}" stroke-width="1"/>` +
  `<circle cx="41.8" cy="39" r="5" fill="#1a1208"/><circle cx="70.2" cy="38" r="5.8" fill="#1a1208"/>` +
  `<circle cx="43.4" cy="36.6" r="1.8" fill="#fff"/><circle cx="72.2" cy="35.4" r="2.1" fill="#fff"/><circle cx="40.4" cy="41.4" r=".9" fill="#fff"/><circle cx="68.6" cy="40.6" r="1" fill="#fff"/>` +
  // mũi, miệng cười, má hồng
  `<circle cx="91" cy="55" r="1.1" fill="${OUT}"/><circle cx="87" cy="53.5" r="1.1" fill="${OUT}"/>` +
  `<path d="M54 63Q74 79 96 60" fill="none" stroke="#7a3f00" stroke-width="2.4" stroke-linecap="round"/>` +
  `<ellipse cx="75" cy="66" rx="5" ry="3.2" fill="#ff8f6b" opacity=".6"/>` +
  // bảng danh hiệu
  `<g>` +
  `<rect x="64" y="68" width="60" height="31" rx="3.5" fill="url(#wood)" stroke="#3f2606" stroke-width="1.2"/>` +
  `<rect x="67" y="71" width="54" height="25" rx="2" fill="url(#plate)" stroke="#b97d00" stroke-width="1"/>` +
  `<path d="M94 73.2l1.5 3.1 3.4.5-2.5 2.4.6 3.4-3-1.6-3 1.6.6-3.4-2.5-2.4 3.4-.5z" fill="#e08e00" stroke="#a86400" stroke-width=".5"/>` +
  `<text x="94.5" y="91.8" text-anchor="middle" font-size="7.6" font-weight="800" fill="#6b3d00" font-family="system-ui,-apple-system,Segoe UI,sans-serif">CÓC PASS</text>` +
  `</g>` +
  // hai tay đỡ bảng
  hand(65, 90) +
  hand(123, 90) +
  `</svg>`;
