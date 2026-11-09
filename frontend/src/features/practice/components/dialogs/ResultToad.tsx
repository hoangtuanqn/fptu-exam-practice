import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ToadArt } from "./ToadArt";
import type { ToadMood } from "./toadMood";

const TOAD_W = 96;
const TOAD_H = 147;
const BUBBLE_W = 250;
const BUBBLE_H = 84; // chiều cao ước lượng của bong bóng (tối đa 3 dòng)
const GAP = 12; // khoảng hở với mép màn hình / khung thông báo
const SETTLE_MS = 380; // chờ hộp thoại bung xong rồi mới đo vị trí (đang bung thì kích thước chưa chuẩn)
const NARROW = 640; // dưới mức này (điện thoại): cóc nổi ở góc màn hình, bong bóng nằm bên cạnh và tự mờ đi
const BUBBLE_SHOW_MS = 6500; // điện thoại: bong bóng hiện chừng này rồi mờ để khỏi che bảng điểm
const CONFETTI = ["#ffc61f", "#e53935", "#43a047", "#1e88e5", "#ab47bc", "#ff8f00"];

interface Place {
  scale: number; // tỉ lệ kích thước cóc (nhỏ hơn trên điện thoại)
  cx: number; // tâm ngang của cóc
  top: number; // mép trên của cóc
  shift: number; // dịch bong bóng sang ngang để không tràn màn hình (đuôi bong bóng vẫn chỉ vào đầu cóc)
  fromX: number; // cóc bắt đầu bay từ xa bên phải bao nhiêu
  corner: boolean; // điện thoại: cóc ở góc màn hình, bong bóng nằm bên trái cóc
  bubbleW: number;
}

/**
 * Cóc là một LỚP RIÊNG nổi trên hộp thoại, không bao giờ làm hộp thoại xê dịch.
 * Màn hình rộng: đứng trên mép trên khung (đủ chỗ), không thì đứng cạnh khung, bong bóng ở trên đầu.
 * Điện thoại: nổi ở góc trên bên phải màn hình, bong bóng bên trái cóc.
 */
function place(dialog: DOMRect, vw: number): Place {
  if (vw < NARROW) {
    const scale = 0.8;
    const tw = TOAD_W * scale;
    const cx = vw - tw / 2 - 6;
    return { scale, cx, top: 10, shift: 0, fromX: vw - cx + tw, corner: true, bubbleW: Math.min(230, vw - tw - 28) };
  }
  const tw = TOAD_W;
  let cx: number;
  let top: number;
  if (dialog.top >= TOAD_H + BUBBLE_H + GAP) {
    cx = Math.min(vw - tw / 2 - GAP, dialog.right - tw / 2 - 16);
    top = dialog.top - TOAD_H + 6; // chân cóc chạm mép trên khung
  } else if (vw - dialog.right >= tw + GAP * 2) {
    cx = dialog.right + GAP + tw / 2;
    top = Math.max(BUBBLE_H + GAP, dialog.top + 24);
  } else {
    cx = vw - tw / 2 - GAP;
    top = BUBBLE_H + GAP;
  }
  const w = Math.min(BUBBLE_W, vw - GAP * 2);
  const shift = Math.min(0, vw - GAP - (cx + w / 2)) + Math.max(0, GAP - (cx - w / 2));
  return { scale: 1, cx, top, shift, fromX: vw - cx + tw, corner: false, bubbleW: w };
}

/**
 * Cóc Pass từ góc trên bên phải màn hình bay chéo xuống, kèm bong bóng lời nhắn bay tới.
 * Vẽ ra <body> thành lớp riêng (không nằm trong hộp thoại, không đổi bố cục hộp thoại). Người bật "giảm chuyển động" thấy cóc đứng yên đúng chỗ.
 */
export function ResultToad({ mood, say }: { mood: ToadMood; say: string }) {
  const sentinel = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<Place | null>(null);
  const [faded, setFaded] = useState(false);

  useLayoutEffect(() => {
    const dialog = sentinel.current?.closest<HTMLElement>('[role="dialog"]');
    if (!dialog) return;
    const scroller = dialog.parentElement; // lớp nền của hộp thoại: cuộn được khi bảng điểm dài
    const measure = () => setPos(place(dialog.getBoundingClientRect(), scroller?.clientWidth ?? window.innerWidth)); // bề rộng nhìn thấy (đã trừ thanh cuộn)
    const t = setTimeout(measure, SETTLE_MS);
    window.addEventListener("resize", measure);
    scroller?.addEventListener("scroll", measure, { passive: true }); // màn hình rộng: cóc đi theo mép khung khi người dùng cuộn
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      scroller?.removeEventListener("scroll", measure);
    };
  }, []);

  // Điện thoại: bong bóng mờ dần sau vài giây (đỡ che bảng điểm)
  const corner = pos?.corner ?? false;
  useEffect(() => {
    if (!corner) return setFaded(false);
    const t = setTimeout(() => setFaded(true), 1250 + BUBBLE_SHOW_MS);
    return () => clearTimeout(t);
  }, [corner]);

  const party = mood === "happy" || mood === "star" || mood === "perfect";
  const layerStyle = pos
    ? ({ left: pos.cx, top: pos.top, width: TOAD_W * pos.scale, marginLeft: (-TOAD_W * pos.scale) / 2, "--bshift": `${pos.shift}px`, "--tail": `${-pos.shift}px`, "--bw": `${pos.bubbleW}px` } as CSSProperties)
    : undefined;
  return (
    <>
      <span ref={sentinel} hidden />
      <p className="sr-only">{say}</p>
      {pos &&
        createPortal(
          <div aria-hidden="true" className="toad-layer" style={layerStyle}>
            <div className={`toad-bubble-wrap ${pos.corner ? "toad-bubble-wrap-side" : ""} ${faded ? "is-faded" : ""}`}>
              <div className={`toad-bubble toad-bubble-${mood} ${pos.corner ? "toad-bubble-side" : ""}`}>{say}</div>
            </div>
            <div className="toad-fly" style={{ "--toad-dx": `${pos.fromX}px` } as CSSProperties}>
              <div className="toad-fall" style={{ "--toad-drop": `${pos.top + TOAD_H + 40}px` } as CSSProperties}>
                <div className={`toad-idle toad-idle-${mood}`}>
                  <ToadArt mood={mood} scale={pos.scale} />
                </div>
              </div>
            </div>
            {party && (
              <div className="toad-confetti">
                {Array.from({ length: mood === "perfect" ? 36 : mood === "star" ? 24 : 12 }, (_, i) => (
                  <span
                    key={i}
                    style={
                      {
                        left: `${(i * 37) % 100}%`,
                        background: CONFETTI[i % CONFETTI.length],
                        "--delay": `${1.1 + ((i * 53) % 90) / 100}s`,
                        "--dur": `${1.6 + ((i * 29) % 12) / 10}s`,
                        "--spin": `${(i % 2 ? 1 : -1) * (240 + ((i * 41) % 200))}deg`,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
