import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ToadArt } from "./ToadArt";
import type { ToadMood } from "./toadMood";

const TOAD_H = 123;
const SPACER_H = 104; // chỗ chừa ở đầu bảng điểm cho cóc đứng
const SETTLE_MS = 380; // chờ hộp thoại bung xong rồi mới đo vị trí (đang bung thì kích thước chưa chuẩn)
const CONFETTI = ["#ffc61f", "#e53935", "#43a047", "#1e88e5", "#ab47bc", "#ff8f00"];

/**
 * Cóc Pass từ trên màn hình nhảy xuống đứng ở đầu bảng điểm, rồi làm động tác theo mức điểm.
 * Vẽ ra <body> (hộp thoại cắt phần tràn nên cóc không thể rơi từ ngoài hộp xuống nếu nằm trong đó).
 * Người bật "giảm chuyển động" thấy cóc đứng yên đúng chỗ, không rơi, không pháo giấy.
 */
export function ResultToad({ mood, board }: { mood: ToadMood; board: string }) {
  const spacer = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      const r = spacer.current?.getBoundingClientRect();
      if (r) setPos({ left: r.left + r.width / 2, top: Math.max(4, r.bottom - TOAD_H) });
    };
    const t = setTimeout(place, SETTLE_MS);
    window.addEventListener("resize", place);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", place);
    };
  }, []);

  const party = mood === "happy" || mood === "star" || mood === "perfect";
  return (
    <>
      <div ref={spacer} aria-hidden="true" style={{ height: SPACER_H }} />
      {pos &&
        createPortal(
          <div aria-hidden="true" className="toad-layer" style={{ left: pos.left, top: pos.top }}>
            <div className="toad-fall" style={{ "--toad-drop": `${pos.top + TOAD_H + 40}px` } as CSSProperties}>
              <div className={`toad-idle toad-idle-${mood}`}>
                <ToadArt mood={mood} board={board} />
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
