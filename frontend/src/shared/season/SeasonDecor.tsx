import { useEffect, useState, type CSSProperties } from "react";
import { useLocation } from "react-router-dom";

// 36 bông tuyết rải sẵn (điện thoại chỉ hiện 16 bông đầu, xem index.css): vị trí ngang, thời gian rơi 14-24s, 3 cỡ 4/6/9px,
// lệch pha, độ trôi ngang
const FLAKES = Array.from({ length: 36 }, (_, i) => ({
  "--x": `${(i * 37 + 11) % 100}%`,
  "--d": `${14 + ((i * 7) % 11)}s`,
  "--s": `${[4, 6, 9][i % 3]}px`,
  "--t": `-${(i * 13) % 24}s`,
  "--dx": `${((i * 23) % 80) - 40}px`,
})) as CSSProperties[];

type SaveDataNavigator = Navigator & { connection?: { saveData?: boolean } };

// Lớp trang trí toàn trang (chỉ tải khi đang mùa và người dùng chưa tắt trang trí):
// - nền tuyết nhạt ở ~360px đầu trang (đỏ nhạt bên trái, xanh nhạt bên phải), nằm tuyệt đối nên không đẩy bố cục;
// - tuyết rơi bằng CSS thuần (chỉ animate transform/opacity), tắt khi tiết kiệm dữ liệu.
// Không có ở màn làm đề và trang quản trị; giảm chuyển động, màn đang làm đề (data-no-bottom-nav) và bản in tắt bằng CSS.
export default function SeasonDecor() {
  const { pathname } = useLocation();
  const [hidden, setHidden] = useState(() => document.hidden);

  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  if (pathname.startsWith("/exam/") || pathname.startsWith("/admin")) return null;
  const saveData = (navigator as SaveDataNavigator).connection?.saveData;

  return (
    <>
      <div aria-hidden className="xmas-tint" />
      {!saveData && (
        <div aria-hidden className={`xmas-snow${hidden ? " is-paused" : ""}`}>
          {FLAKES.map((style, i) => (
            <i key={i} style={style} />
          ))}
        </div>
      )}
    </>
  );
}
