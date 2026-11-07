import { useEffect, useRef, useState } from "react";
import { CalendarCheck, Check, Gift, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/shared/api/client";
import { useToast } from "@/shared/context/ToastContext";
import { Button } from "@/shared/ui/Button";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { checkInApi, type CheckInResult, type CheckInStatus } from "./check-in.api";

// Menu tài khoản bắn sự kiện này để mở lại hộp điểm danh (khi người dùng lỡ đóng)
export const OPEN_CHECKIN_EVENT = "fepass:open-checkin";

// Ngày hiện tại theo giờ Việt Nam (YYYY-MM-DD), khớp mốc đổi ngày 0h của máy chủ
const vnToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());

const fmt = (n: number) => n.toLocaleString("vi-VN");

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

  const done = !!result || status.claimedToday;
  const completed = result ? result.completedDays : status.completedDays;
  const streak = result ? result.streak : status.streak;
  const close = () => setOpen(false);

  return (
    <Modal onClose={close}>
      <ModalTitle icon={CalendarCheck}>Điểm danh hằng ngày</ModalTitle>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        Vào mỗi ngày nhận <b className="text-slate-900">{fmt(status.dailyAmount)} credit</b>. Đủ {status.days} ngày liên tiếp, ngày thứ {status.days} nhận thêm{" "}
        <b className="text-slate-900">{fmt(status.bonus)} credit</b>.
      </p>

      <ol className="mt-5 grid grid-cols-7 gap-1.5">
        {Array.from({ length: status.days }, (_, i) => i + 1).map((d) => {
          const got = d <= completed;
          const today = !done && d === status.cycleDay;
          const last = d === status.days;
          return (
            <li
              key={d}
              className={`flex flex-col items-center rounded-xl border px-1 py-2 text-center ${
                got ? "border-emerald-200 bg-emerald-50" : today ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/25" : "border-slate-200 bg-white"
              }`}
            >
              <span className="text-[10px] font-medium uppercase text-slate-500">Ngày {d}</span>
              <span className="my-1 flex h-6 items-center justify-center">
                {got ? <Check size={18} strokeWidth={3} className="text-emerald-600" /> : last ? <Gift size={18} className="text-amber-500" /> : <span className="h-2 w-2 rounded-full bg-slate-300" />}
              </span>
              <span className={`text-xs font-semibold tabular-nums ${got ? "text-emerald-700" : today ? "text-brand-800" : "text-slate-500"}`}>+{fmt(last ? status.dailyAmount + status.bonus : status.dailyAmount)}</span>
            </li>
          );
        })}
      </ol>

      {streak > 0 && <p className="mt-3 text-center text-xs text-slate-500">Chuỗi hiện tại: {streak} ngày liên tiếp</p>}

      {result ? (
        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-center">
          <div className="text-sm text-emerald-800">Đã nhận</div>
          <div className="font-display text-3xl font-bold text-emerald-700">+{fmt(result.amount)} credit</div>
          {result.bonus > 0 && <div className="mt-0.5 text-xs text-emerald-800">gồm {fmt(result.bonus)} credit thưởng đủ {status.days} ngày liên tiếp</div>}
        </div>
      ) : status.claimedToday ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-center text-sm text-slate-600">Hôm nay bạn đã điểm danh rồi.</p>
      ) : null}

      {done && <p className="mt-3 text-center text-xs text-slate-500">Qua 0h (giờ Việt Nam) bạn có thể điểm danh tiếp.</p>}

      <ModalActions>
        {done ? (
          <Button grow variant="primary" onClick={close}>
            Đóng
          </Button>
        ) : (
          <>
            <Button grow onClick={close} disabled={claiming}>
              Để sau
            </Button>
            <Button grow variant="primary" onClick={() => void claim()} disabled={claiming}>
              {claiming ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
              Nhận {fmt(status.todayAmount)} credit
            </Button>
          </>
        )}
      </ModalActions>
    </Modal>
  );
}
