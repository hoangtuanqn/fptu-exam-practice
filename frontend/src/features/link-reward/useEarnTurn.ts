import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/shared/api/errors";
import { linkRewardApi, type FreeTurnStatus } from "./link-reward.api";

const POLL_MS = 5000;
const WAIT_LIMIT_MS = 30 * 60 * 1000; // link vượt link hết hiệu lực sau 30 phút: ngừng chờ

type Phase = "idle" | "starting" | "waiting";

/**
 * Luồng "vượt link nhận lượt": bấm → máy chủ tạo link Link4M → mở ở tab mới → chờ người dùng làm xong rồi quay lại.
 * Trong lúc chờ, hỏi lại trạng thái mỗi 5 giây (và ngay khi người dùng quay lại tab này); thấy số lượt tăng thì báo xong.
 * Tab Link4M mở ngay trong lúc bấm (trình duyệt chỉ cho mở tab do người dùng bấm), rồi mới chuyển sang địa chỉ vừa tạo.
 */
export function useEarnTurn(onGranted?: (status: FreeTurnStatus) => void) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null); // trình duyệt chặn mở tab: người dùng bấm vào liên kết này
  const baseline = useRef(0);
  const startedAt = useRef(0);
  const granted = useRef(onGranted);
  granted.current = onGranted;

  const check = useCallback(async () => {
    try {
      const s = await linkRewardApi.status();
      if (s.available > baseline.current) {
        setPhase("idle");
        setFallbackUrl(null);
        granted.current?.(s);
      }
    } catch {
      /* mạng chập chờn: lần hỏi sau */
    }
  }, []);

  useEffect(() => {
    if (phase !== "waiting") return;
    const timer = setInterval(() => {
      if (Date.now() - startedAt.current > WAIT_LIMIT_MS) return setPhase("idle");
      if (document.visibilityState === "visible") void check();
    }, POLL_MS);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [phase, check]);

  const start = useCallback(async (currentAvailable: number) => {
    setError(null);
    setFallbackUrl(null);
    setPhase("starting");
    baseline.current = currentAvailable;
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    try {
      const { shortUrl } = await linkRewardApi.start();
      startedAt.current = Date.now();
      if (tab) tab.location.href = shortUrl;
      else setFallbackUrl(shortUrl);
      setPhase("waiting");
    } catch (err) {
      tab?.close();
      setError(errorMessage(err, "Chưa tạo được liên kết, vui lòng thử lại"));
      setPhase("idle");
    }
  }, []);

  return { phase, error, fallbackUrl, start, cancel: () => setPhase("idle") };
}
