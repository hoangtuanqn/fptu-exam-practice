import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/shared/api/client";
import { useToast } from "@/shared/context/ToastContext";
import { checkInApi, type CheckInResult, type CheckInStatus } from "./check-in.api";
import { CheckInView } from "./CheckInView";

// Menu tài khoản bắn sự kiện này để mở lại hộp điểm danh (khi người dùng lỡ đóng)
export const OPEN_CHECKIN_EVENT = "fepass:open-checkin";

// Ngày hiện tại theo giờ Việt Nam (YYYY-MM-DD), khớp mốc đổi ngày 0h của máy chủ
const vnToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());

/**
 * Hộp điểm danh hằng ngày: hiện NGAY khi đăng nhập xong (hoặc mở lại trang) nếu hôm nay chưa nhận thưởng.
 * Nhận rồi thì không hiện lại cho tới sau 0h (giờ Việt Nam). Đóng mà chưa nhận thì vẫn nhận được từ menu tài khoản.
 */
export function DailyCheckInPopup() {
  const { user, loading, refresh } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState<CheckInStatus | null>(null);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [open, setOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [tick, setTick] = useState(0); // đổi khi quay lại tab, để qua 0h là kiểm tra lại
  const checkedFor = useRef(""); // "<id người dùng>:<ngày VN>" đã kiểm tra, mỗi ngày chỉ tự mở một lần

  const verified = !!user?.emailVerifiedAt;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      checkedFor.current = ""; // đăng xuất: lần đăng nhập sau (kể cả cùng ngày) hiện lại nếu chưa nhận
      setOpen(false);
      return;
    }
    if (!verified) return;
    const key = `${user.id}:${vnToday()}`;
    if (checkedFor.current === key) return;
    checkedFor.current = key;
    setResult(null);
    void checkInApi
      .status()
      .then((s) => {
        setStatus(s);
        if (s.canClaim) setOpen(true);
      })
      .catch(() => {
        checkedFor.current = ""; // lỗi mạng: lần sau thử lại
      });
  }, [user, loading, verified, tick]);

  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && setTick((t) => t + 1);
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    const onOpen = () => {
      if (!user) return;
      void checkInApi
        .status()
        .then((s) => {
          if (s.needVerify) return toast.error("Hãy xác minh email để điểm danh nhận thưởng");
          setStatus(s);
          setResult(null);
          setOpen(true);
        })
        .catch(() => toast.error("Chưa mở được điểm danh, bạn thử lại nhé"));
    };
    window.addEventListener(OPEN_CHECKIN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CHECKIN_EVENT, onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function claim() {
    setClaiming(true);
    try {
      setResult(await checkInApi.claim());
      void refresh(); // cập nhật số dư trên header
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Chưa nhận được, bạn thử lại nhé");
      void checkInApi.status().then(setStatus).catch(() => undefined); // có thể đã nhận ở thiết bị khác
    } finally {
      setClaiming(false);
    }
  }

  if (!open || !status) return null;

  return <CheckInView status={status} result={result} claiming={claiming} onClaim={() => void claim()} onClose={() => setOpen(false)} />;
}
