import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ToadArt } from "./ToadArt";
import type { ToadMood } from "./toadMood";

const TOAD_W = 118;
const TOAD_H = 97;
const BUBBLE_W = 250;
const BUBBLE_H = 84; // chiều cao ước lượng của bong bóng (tối đa 3 dòng)
const GAP = 12; // khoảng hở với mép màn hình / khung thông báo
const SETTLE_MS = 380; // chờ hộp thoại bung xong rồi mới đo vị trí (đang bung thì kích thước chưa chuẩn)
const CONFETTI = ["#ffc61f", "#e53935", "#43a047", "#1e88e5", "#ab47bc", "#ff8f00"];

interface Place {
  cx: number; // tâm ngang của cóc
  top: number; // mép trên của cóc
  shift: number; // dịch bong bóng sang ngang để không tràn màn hình (đuôi bong bóng vẫn chỉ vào đầu cóc)
  fromX: number; // cóc bắt đầu bay từ xa bên phải bao nhiêu
}

/**
 * Chọn chỗ đứng cho cóc, luôn NGOÀI khung thông báo: đứng trên mép trên khung (nếu đủ chỗ cho cóc + bong bóng),
 * không thì đứng cạnh khung, không nữa thì ở góc trên bên phải màn hình.
 */
function place(dialog: DOMRect): Place {
  const vw = window.innerWidth;
  let cx: number;
  let top: number;
  if (dialog.top >= TOAD_H + BUBBLE_H + GAP) {
    cx = Math.min(vw - TOAD_W / 2 - GAP, dialog.right - TOAD_W / 2 - 20);
    top = dialog.top - TOAD_H + 6; // chân cóc chạm mép trên khung
  } else if (vw - dialog.right >= TOAD_W + GAP * 2) {
    cx = dialog.right + GAP + TOAD_W / 2;
    top = Math.max(BUBBLE_H + GAP, dialog.top + 24);
  } else {
    cx = vw - TOAD_W / 2 - GAP;
    top = BUBBLE_H + GAP;
  }
  const w = Math.min(BUBBLE_W, vw - GAP * 2);
  const shift = Math.min(0, vw - GAP - (cx + w / 2)) + Math.max(0, GAP - (cx - w / 2));
  return { cx, top, shift, fromX: vw - cx + TOAD_W };
}

/**
 * Cóc Pass từ góc trên bên phải màn hình bay chéo xuống đứng cạnh khung thông báo, kèm bong bóng lời nhắn bay tới trên đầu.
 * Vẽ ra <body> (tách khỏi khung thông báo, không bị cắt khi khung cuộn). Người bật "giảm chuyển động" thấy cóc đứng yên đúng chỗ.
 */
export function ResultToad({ mood, board, say }: { mood: ToadMood; board: string; say: string }) {
  const sentinel = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<Place | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const dialog = sentinel.current?.closest<HTMLElement>('[role="dialog"]');
      if (dialog) setPos(place(dialog.getBoundingClientRect()));
    };
    const t = setTimeout(measure, SETTLE_MS);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const party = mood === "happy" || mood === "star" || mood === "perfect";
  const layerStyle = pos ? ({ left: pos.cx, top: pos.top, "--bshift": `${pos.shift}px`, "--tail": `${-pos.shift}px` } as CSSProperties) : undefined;
  return (
    <>
      <span ref={sentinel} hidden />
      <p className="sr-only">{say}</p>
      {pos &&
        createPortal(
          <div aria-hidden="true" className="toad-layer" style={layerStyle}>
            <div className="toad-bubble-wrap">
              <div className={`toad-bubble toad-bubble-${mood}`}>{say}</div>
            </div>
            <div className="toad-fly" style={{ "--toad-dx": `${pos.fromX}px` } as CSSProperties}>
              <div className="toad-fall" style={{ "--toad-drop": `${pos.top + TOAD_H + 40}px` } as CSSProperties}>
                <div className={`toad-idle toad-idle-${mood}`}>
                  <ToadArt mood={mood} board={board} />
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
