import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ToadArt } from "./ToadArt";
import type { ToadMood } from "./toadMood";

const TOAD_W = 96;
const TOAD_H = 147;
const BUBBLE_W = 250;
const BUBBLE_H = 84; // chiều cao ước lượng của bong bóng (tối đa 3 dòng)
const GAP = 12; // khoảng hở với mép màn hình / khung thông báo
const SETTLE_MS = 380; // chờ hộp thoại bung xong rồi mới đo vị trí (đang bung thì kích thước chưa chuẩn)
const CONFETTI = ["#ffc61f", "#e53935", "#43a047", "#1e88e5", "#ab47bc", "#ff8f00"];

const NARROW = 640; // dưới mức này (điện thoại) cóc nhỏ lại và khung thông báo được đẩy xuống để chừa chỗ cho cóc + bong bóng

interface Place {
  scale: number; // tỉ lệ kích thước cóc (nhỏ hơn trên điện thoại)
  cx: number; // tâm ngang của cóc
  top: number; // mép trên của cóc
  shift: number; // dịch bong bóng sang ngang để không tràn màn hình (đuôi bong bóng vẫn chỉ vào đầu cóc)
  fromX: number; // cóc bắt đầu bay từ xa bên phải bao nhiêu
}

/**
 * Chọn chỗ đứng cho cóc, luôn NGOÀI khung thông báo: đứng trên mép trên khung (nếu đủ chỗ cho cóc + bong bóng),
 * không thì đứng cạnh khung, không nữa thì ở góc trên bên phải màn hình.
 */
function place(dialog: DOMRect, scale: number, vw: number): Place {
  const tw = TOAD_W * scale;
  const th = TOAD_H * scale;
  let cx: number;
  let top: number;
  if (dialog.top >= th + BUBBLE_H + GAP) {
    cx = Math.min(vw - tw / 2 - GAP, dialog.right - tw / 2 - 16);
    top = dialog.top - th + 6; // chân cóc chạm mép trên khung
  } else if (vw - dialog.right >= tw + GAP * 2) {
    cx = dialog.right + GAP + tw / 2;
    top = Math.max(BUBBLE_H + GAP, dialog.top + 24);
  } else {
    cx = vw - tw / 2 - GAP;
    top = BUBBLE_H + GAP;
  }
  const w = Math.min(BUBBLE_W, vw - GAP * 2);
  const shift = Math.min(0, vw - GAP - (cx + w / 2)) + Math.max(0, GAP - (cx - w / 2));
  return { scale, cx, top, shift, fromX: vw - cx + tw };
}

/**
 * Cóc Pass từ góc trên bên phải màn hình bay chéo xuống đứng cạnh khung thông báo, kèm bong bóng lời nhắn bay tới trên đầu.
 * Vẽ ra <body> (tách khỏi khung thông báo, không bị cắt khi khung cuộn). Người bật "giảm chuyển động" thấy cóc đứng yên đúng chỗ.
 */
export function ResultToad({ mood, say }: { mood: ToadMood; say: string }) {
  const sentinel = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<Place | null>(null);

  useLayoutEffect(() => {
    const dialog = sentinel.current?.closest<HTMLElement>('[role="dialog"]');
    if (!dialog) return;
    const scroller = dialog.parentElement; // lớp nền của hộp thoại: cuộn được khi bảng điểm dài
    // Điện thoại: đẩy khung thông báo xuống để có chỗ cho cóc + bong bóng phía trên (không phải đè lên khung). Làm ngay để khung không giật xuống về sau.
    const reserve = () => {
      const narrow = window.innerWidth < NARROW;
      const scale = narrow ? 0.8 : 1;
      dialog.style.marginTop = narrow ? `${Math.ceil(TOAD_H * scale + BUBBLE_H + GAP)}px` : "";
      return scale;
    };
    reserve();
    const measure = () => setPos(place(dialog.getBoundingClientRect(), reserve(), scroller?.clientWidth ?? window.innerWidth)); // bề rộng nhìn thấy (đã trừ thanh cuộn)
    const t = setTimeout(measure, SETTLE_MS);
    window.addEventListener("resize", measure);
    scroller?.addEventListener("scroll", measure, { passive: true }); // cóc đi theo khung khi người dùng cuộn
    return () => {
      clearTimeout(t);
      dialog.style.marginTop = "";
      window.removeEventListener("resize", measure);
      scroller?.removeEventListener("scroll", measure);
    };
  }, []);

  const party = mood === "happy" || mood === "star" || mood === "perfect";
  const layerStyle = pos ? ({ left: pos.cx, top: pos.top, width: TOAD_W * pos.scale, marginLeft: (-TOAD_W * pos.scale) / 2, "--bshift": `${pos.shift}px`, "--tail": `${-pos.shift}px` } as CSSProperties) : undefined;
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
