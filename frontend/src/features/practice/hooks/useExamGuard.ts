import { useCallback, useEffect, useRef, useState } from "react";

// iPhone Safari không có Fullscreen API cho trang web: khi đó tắt hẳn chế độ canh toàn màn hình
export const canFullscreen = typeof document !== "undefined" && typeof document.documentElement.requestFullscreen === "function";

let pending = false; // đã xin toàn màn hình, trình duyệt chưa trả lời: coi như đang ở trong để không nháy lớp phủ

// Gọi trong chính sự kiện bấm của người dùng, trình duyệt mới cho vào toàn màn hình
export function enterFullscreen() {
  if (!canFullscreen || document.fullscreenElement) return;
  pending = true;
  document.documentElement.requestFullscreen().then(
    () => void (pending = false),
    () => {
      pending = false;
      document.dispatchEvent(new Event("fullscreenerror")); // báo cho guard hiện lại lớp phủ "Vào toàn màn hình"
    },
  );
}

const visible = () => document.visibilityState === "visible";
const inside = () => !!document.fullscreenElement && visible();
const DAY = 86_400; // trần server cho at/sec

// enter = chưa vào toàn màn hình (mở thẳng bằng địa chỉ, tải lại trang): chưa tính vi phạm; left = đã rời bài thi
export type GuardAway = "enter" | "left" | null;

interface Options {
  active: boolean; // đang thi (chế độ Thi, đồng hồ đang chạy)
  elapsed: number; // giây đã làm, để ghi lúc rời
  count: number; // số vi phạm đã có: vị trí của lần rời sắp ghi
  onLeave: (at: number) => void; // thêm một vi phạm { at, sec: 0 }
  onBack: (index: number, sec: number) => void; // chốt số giây ở ngoài của vi phạm thứ index
}

// Canh bài thi toàn màn hình chỉ bằng sự kiện (fullscreenchange, visibilitychange, blur/focus), không hỏi vòng.
// Lần rời đang mở giữ trong ref; chỉ setState lúc bắt đầu và kết thúc một lần rời.
export function useExamGuard({ active, elapsed, count, onLeave, onBack }: Options) {
  const on = active && canFullscreen;
  const [away, setAway] = useState<GuardAway>(null);
  const live = useRef({ elapsed, count, onLeave, onBack });
  live.current = { elapsed, count, onLeave, onBack };
  const entered = useRef(false); // đã từng ở trong toàn màn hình trong lượt canh này
  const episode = useRef<{ index: number; since: number } | null>(null);
  const added = useRef({ count, extra: 0 }); // vi phạm đã thêm mà chưa render xong: để vị trí mỗi lần rời không trùng

  // Thêm một vi phạm, trả về vị trí của nó ngay (count có thể chưa kịp cập nhật)
  const add = useCallback(() => {
    const { elapsed: at, count: n } = live.current;
    if (added.current.count !== n) added.current = { count: n, extra: 0 };
    const index = n + added.current.extra++;
    live.current.onLeave(Math.min(at, DAY));
    return index;
  }, []);

  const close = useCallback(() => {
    const ep = episode.current;
    episode.current = null;
    if (ep) live.current.onBack(ep.index, Math.min(DAY, Math.round((Date.now() - ep.since) / 1000)));
  }, []);

  const back = useCallback(() => {
    if (!inside()) return;
    entered.current = true;
    close();
    setAway(null);
  }, [close]);

  useEffect(() => {
    if (!on) return;
    const leave = () => {
      if (!entered.current || episode.current) return; // chưa vào toàn màn hình, hoặc đang trong một lần rời: không tính thêm
      episode.current = { index: add(), since: Date.now() };
      setAway("left");
    };
    const onChange = () => {
      if (inside()) back();
      else if (entered.current) leave();
      else setAway(pending && visible() ? null : "enter");
    };
    entered.current = false;
    onChange();
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("fullscreenerror", onChange);
    document.addEventListener("visibilitychange", onChange);
    window.addEventListener("blur", leave);
    window.addEventListener("focus", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("fullscreenerror", onChange);
      document.removeEventListener("visibilitychange", onChange);
      window.removeEventListener("blur", leave);
      window.removeEventListener("focus", onChange);
      close(); // nộp bài / thoát đề lúc đang ở ngoài: chốt luôn số giây
      setAway(null);
    };
  }, [on, back, close, add]);

  // Nút "Quay lại làm bài": đã toàn màn hình sẵn (chỉ mất focus) thì vào lại ngay, không thì xin toàn màn hình
  const resume = useCallback(() => {
    if (document.fullscreenElement) back();
    else enterFullscreen();
  }, [back]);

  // Lớp phủ bị gỡ khỏi trang (devtools): tính thêm một vi phạm
  const tamper = useCallback(() => void add(), [add]);

  // Gọi ngay trước quiz.submit() trong cùng sự kiện: chốt số giây của lần rời đang mở vào cùng lần render với nộp bài
  return { away: on ? away : null, resume, tamper, finish: close };
}
