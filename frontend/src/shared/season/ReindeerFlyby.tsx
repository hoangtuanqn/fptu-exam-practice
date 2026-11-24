import { useEffect, useState } from "react";
import { useMascotSvg } from "./useMascotSvg";

// Tuần lộc kéo xe trượt chở Cóc Pass bay ngang màn hình, thỉnh thoảng mới một lần (lần đầu sau ~12s, các lần sau cách 50-100s).
// Chỉ animate transform bằng CSS (.reindeer-*), không nhận thao tác; người bật "giảm chuyển động" không thấy gì.

const OUT = "#5f3a0d";
const FUR = "#b87333";

const leg = (x: number, cls: string) =>
  `<g transform="translate(${x} 50)"><g class="reindeer-leg ${cls}"><path d="M0 0L1 20" stroke="${OUT}" stroke-width="6" stroke-linecap="round"/><path d="M0 0L1 20" stroke="${FUR}" stroke-width="3.6" stroke-linecap="round"/></g></g>`;

const REINDEER_SVG =
  `<svg viewBox="0 0 120 80" width="120" height="80" xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round">` +
  leg(40, "a") + leg(48, "b") +
  // gạc sau, thân, cổ, đầu
  `<path d="M96 16L99 5M99 10L106 7" fill="none" stroke="#7a4b00" stroke-width="2.4" stroke-linecap="round"/>` +
  `<ellipse cx="58" cy="42" rx="28" ry="14" fill="${FUR}" stroke="${OUT}" stroke-width="1.8"/>` +
  `<ellipse cx="56" cy="50" rx="18" ry="6" fill="#f3dcb4" opacity=".85"/>` +
  `<circle cx="29" cy="38" r="5" fill="#fff" stroke="${OUT}" stroke-width="1.4"/>` +
  `<path d="M76 36L88 21L99 31L84 50Z" fill="${FUR}" stroke="${OUT}" stroke-width="1.8"/>` +
  `<path d="M81 38L90 27" stroke="#d62828" stroke-width="3.4" stroke-linecap="round"/><circle cx="83" cy="41" r="2.6" fill="#ffd23a" stroke="#a86400" stroke-width=".8"/>` +
  `<circle cx="93" cy="26" r="11" fill="${FUR}" stroke="${OUT}" stroke-width="1.8"/>` +
  `<ellipse cx="102" cy="30" rx="7" ry="5.4" fill="#f3dcb4" stroke="${OUT}" stroke-width="1.4"/>` +
  `<circle cx="107" cy="29" r="3.4" fill="#e53935" stroke="#9b1414" stroke-width=".8"/><circle cx="106" cy="28" r="1" fill="#ff8a80"/>` +
  `<ellipse cx="85" cy="19" rx="3" ry="5.5" fill="${FUR}" stroke="${OUT}" stroke-width="1.4" transform="rotate(-30 85 19)"/>` +
  `<circle cx="96" cy="23" r="2" fill="#1a1208"/><circle cx="96.6" cy="22.4" r=".6" fill="#fff"/>` +
  // gạc trước
  `<path d="M90 16L87 4M87 9L80 6M88 6L92 0" fill="none" stroke="#7a4b00" stroke-width="2.6" stroke-linecap="round"/>` +
  leg(70, "b") + leg(78, "a") +
  `</svg>`;

const SLEIGH_SVG =
  `<svg viewBox="0 0 100 40" width="100" height="40" xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round">` +
  `<path d="M6 8H72C77 8 78 15 73 24L63 31H14C8 31 4 20 6 8Z" fill="#d62828" stroke="#7a1414" stroke-width="1.8"/>` +
  `<path d="M9 16H74" stroke="#ffd23a" stroke-width="2.4" stroke-linecap="round"/>` +
  `<path d="M2 36H76C86 36 90 30 86 26" fill="none" stroke="#e0a000" stroke-width="3" stroke-linecap="round"/>` +
  `<path d="M22 31V36M58 31V36" stroke="#e0a000" stroke-width="2.4"/></svg>`;

const randomDelay = (first: boolean) => (first ? 12_000 : 50_000 + Math.random() * 50_000);

export default function ReindeerFlyby() {
  const toad = useMascotSvg();
  const [flying, setFlying] = useState(false);
  const [first, setFirst] = useState(true);

  useEffect(() => {
    if (flying || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setFlying(true), randomDelay(first));
    return () => clearTimeout(t);
  }, [flying, first]);

  if (!flying) return null;
  return (
    <div
      aria-hidden
      className="reindeer-fly"
      onAnimationEnd={(e) => {
        if (e.target !== e.currentTarget) return;
        setFlying(false);
        setFirst(false);
      }}
    >
      <div className="reindeer-bob">
        <div className="reindeer-sleigh">
          <div className="reindeer-toad" dangerouslySetInnerHTML={{ __html: toad }} />
          <div dangerouslySetInnerHTML={{ __html: SLEIGH_SVG }} />
        </div>
        <div className="reindeer-rope" />
        <div dangerouslySetInnerHTML={{ __html: REINDEER_SVG }} />
      </div>
    </div>
  );
}
