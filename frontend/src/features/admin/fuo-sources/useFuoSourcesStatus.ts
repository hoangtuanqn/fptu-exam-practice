import { useCallback, useEffect, useState } from "react";
import { useApi } from "@/shared/hooks/useApi";
import { EVENTS } from "@/shared/realtime/events";
import { isRealtimeConnected, onConnectionChange, onServerEvent } from "@/shared/realtime/socket";
import { fuoSourcesApi, type FuoSourcesStatus } from "./fuo-sources.api";

const FALLBACK_POLL_MS = 5000; // chỉ dùng khi mất kết nối realtime và đang có lượt chạy

/**
 * Trạng thái lượt nạp + số link theo trạng thái. Tải một lần, sau đó nhận cập nhật qua socket (admin tự vào phòng admin).
 * Mất kết nối trong lúc lượt đang chạy thì hỏi định kỳ GET /status. `set`/`refresh` để trang cập nhật sau các thao tác.
 */
export function useFuoSourcesStatus() {
  const query = useApi(() => fuoSourcesApi.status(), []);
  const [live, setLive] = useState<FuoSourcesStatus | null>(null);
  const status = live ?? query.data;
  const running = status?.run?.status === "RUNNING";
  const refresh = useCallback(() => void fuoSourcesApi.status().then(setLive).catch(() => undefined), []);

  useEffect(() => onServerEvent<FuoSourcesStatus>(EVENTS.fuoSources, setLive), []);

  useEffect(() => {
    if (!running) return;
    let poll: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      poll ??= setInterval(refresh, FALLBACK_POLL_MS);
    };
    const stop = () => {
      if (poll) clearInterval(poll);
      poll = null;
    };
    const off = onConnectionChange((connected) => {
      if (!connected) return start();
      stop();
      refresh(); // bù các cập nhật đã lỡ trong lúc mất kết nối
    });
    if (!isRealtimeConnected()) start();
    return () => {
      off();
      stop();
    };
  }, [running, refresh]);

  return { query, status, running, set: setLive, refresh };
}
