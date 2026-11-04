import { useEffect, useRef } from "react";

const PEEK_PX = 30; // phần mép thẻ phía sau còn lộ ra khi ô phía trước đã che gần hết
const TILT_DEG = 4.5; // thẻ phía sau nghiêng chừng này độ (góc phải nhô lên)
const SCROLL_RANGE = 260; // cuộn chừng này px thì hiệu ứng hoàn tất
const BACK_SHARE = 0.5; // một nửa quãng cần che là do thẻ phía sau trôi xuống chậm hơn lúc cuộn (thị sai), nửa còn lại do thẻ trước kéo lên

// Cha gần nhất có thanh cuộn dọc (trang chủ cuộn trong một khung, không phải cả cửa sổ)
function findScroller(el: HTMLElement): HTMLElement | Window {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if (o === "auto" || o === "scroll") return p;
  }
  return window;
}

/**
 * Hiệu ứng "xấp thẻ" khi cuộn (màn hình rộng): kéo xuống thì khối `over` trượt dần lên che gần hết khối `under`,
 * chỉ chừa một mép nhỏ. `under` nghiêng nhẹ và tối bớt như tấm thẻ nằm lùi phía sau; `over` có bóng đổ lên trên.
 *
 * `over` được kéo lên bằng margin âm (không phải transform) để các phần phía dưới đi lên theo, không để lại khoảng trống.
 * Mỗi đoạn cuộn là một hàm cố định của vị trí cuộn, nên cuộn lên là mọi thứ trở về đúng như cũ.
 * Cả hai khối cần có một thẻ bọc ngoài (`parentElement`) nằm cùng một khung định vị; `over` bọc ngoài là phần bị kéo lên.
 */
export function useScrollOverlap() {
  const under = useRef<HTMLDivElement>(null);
  const over = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const u = under.current;
    const o = over.current;
    const uOuter = u?.parentElement;
    const oOuter = o?.parentElement;
    if (!u || !o || !uOuter || !oOuter) return;

    const media = window.matchMedia("(min-width: 768px)");
    const scroller = findScroller(o);
    const scrollTop = () => (scroller instanceof Window ? window.scrollY : scroller.scrollTop);
    // Margin đổi theo cuộn làm bố cục dịch chuyển: tắt neo cuộn của trình duyệt để nó không "sửa" lại vị trí cuộn
    if (!(scroller instanceof Window)) scroller.style.overflowAnchor = "none";

    let frame = 0;
    let applied = 0; // margin âm đang áp dụng (px, dương)

    const apply = () => {
      frame = 0;
      // Vị trí tự nhiên của khối `over` khi chưa bị kéo lên = vị trí hiện tại + phần đã kéo
      const naturalTop = oOuter.offsetTop + applied;
      const distance = Math.max(naturalTop - uOuter.offsetTop - PEEK_PX, 0);

      const p = media.matches ? Math.min(Math.max(scrollTop() / SCROLL_RANGE, 0), 1) : 0;
      const e = 1 - Math.pow(1 - p, 3); // nhanh lúc đầu, chậm dần khi chạm: "nhảy" lên rồi êm xuống
      const sink = distance * BACK_SHARE * e; // thẻ sau lùi xuống so với nhịp cuộn
      const pull = Math.round(distance * (1 - BACK_SHARE) * e); // thẻ trước vọt lên

      if (pull !== applied) {
        oOuter.style.marginTop = pull ? `-${pull}px` : "";
        applied = pull;
      }
      u.style.transform = e ? `translateY(${sink.toFixed(1)}px) rotate(${-TILT_DEG * e}deg)` : "";
      u.style.filter = e ? `brightness(${1 - 0.22 * e})` : "";
      o.style.filter = e ? `drop-shadow(0 -16px 30px rgba(2, 6, 23, ${0.28 * e}))` : "";
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    media.addEventListener("change", onScroll);
    apply();
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      media.removeEventListener("change", onScroll);
      if (frame) cancelAnimationFrame(frame);
      oOuter.style.marginTop = "";
    };
  }, []);

  return { under, over };
}
