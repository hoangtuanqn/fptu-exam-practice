import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { gradeApi, type ExtensionGrades } from "./grade.api";

// Cầu nối với tiện ích Chrome FePass (chrome-extension/site.js):
//  - website công bố công tắc đồng bộ qua data-fepass-grade-sync để tiện ích biết có được đọc điểm FAP không;
//  - tiện ích trả điểm đã đọc qua sự kiện "fepass:grades" (chuỗi JSON); website tự gửi lên tài khoản đang đăng nhập;
//  - popup của tiện ích xin bật/tắt đồng bộ qua sự kiện "fepass:set-sync"; website làm rồi trả lời bằng "fepass:set-sync-result".
// Cầu nối chạy ở MỌI trang của website (GradeBridgeHost), nên điểm tự gửi lên ngay khi có bất kỳ tab FePass nào đang mở.
const MIN_EXTENSION = "1.4.0";
const UPLOADED_KEY = "fepass.grades.uploadedAt";

const isNewer = (a: string, b: string) => {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return false;
};

const readUploaded = () => {
  try {
    return Number(localStorage.getItem(UPLOADED_KEY)) || 0;
  } catch {
    return 0;
  }
};

// ---- Trạng thái dùng chung giữa GradeBridgeHost (toàn site) và thẻ ở trang Điểm FAP
interface BridgeState {
  enabled: boolean | null; // null = chưa biết (chưa hỏi máy chủ): chưa công bố gì cho tiện ích
  error: string | null;
}
let state: BridgeState = { enabled: null, error: null };
const listeners = new Set<() => void>();
const uploadedListeners = new Set<() => void>();
let uploading = 0; // thời điểm (at) của lượt đang gửi: tránh gửi trùng khi nhận cùng sự kiện nhiều lần

export const gradeBridge = {
  get: () => state,
  set(patch: Partial<BridgeState>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
  onUploaded(l: () => void) {
    uploadedListeners.add(l);
    return () => void uploadedListeners.delete(l);
  },
};

export const useGradeBridgeState = () => useSyncExternalStore(gradeBridge.subscribe, gradeBridge.get);

/** Tiện ích đã cài chưa và có đủ mới không (content script của tiện ích đặt data-fepass-ext lên thẻ <html>) */
export function useExtensionStatus() {
  const [version, setVersion] = useState(() => document.documentElement.dataset.fepassExt ?? "");
  useEffect(() => {
    const root = document.documentElement;
    const check = () => setVersion(root.dataset.fepassExt ?? "");
    check();
    const mo = new MutationObserver(check);
    mo.observe(root, { attributes: true, attributeFilter: ["data-fepass-ext"] });
    return () => mo.disconnect();
  }, []);
  return { installed: !!version, outdated: !!version && isNewer(MIN_EXTENSION, version) };
}

/**
 * Phần chạy nền của cầu nối (chỉ GradeBridgeHost gọi). `enabled`: công tắc đồng bộ của tài khoản; null = chưa biết.
 * Công bố công tắc cho tiện ích, và gửi điểm tiện ích đọc được lên tài khoản khi đồng bộ đang bật.
 */
export function useGradeBridge(enabled: boolean | null) {
  useEffect(() => {
    if (enabled === null) return;
    document.documentElement.dataset.fepassGradeSync = enabled ? "on" : "off";
  }, [enabled]);

  const upload = useCallback(async (raw: string) => {
    let data: ExtensionGrades | null = null;
    try {
      data = JSON.parse(raw) as ExtensionGrades | null;
    } catch {
      return;
    }
    if (!data || !Array.isArray(data.courses) || (data.courses.length === 0 && !data.exams?.length) || data.at <= readUploaded() || data.at === uploading) return;
    uploading = data.at;
    try {
      await gradeApi.sync(data.courses, Array.isArray(data.exams) ? data.exams : undefined);
      try {
        localStorage.setItem(UPLOADED_KEY, String(data.at));
      } catch {
        /* bỏ qua: lần sau sẽ gửi lại, server ghi đè nên không sao */
      }
      gradeBridge.set({ error: null });
      uploadedListeners.forEach((l) => l());
    } catch (e) {
      gradeBridge.set({ error: e instanceof Error ? e.message : "Chưa gửi được điểm lên tài khoản" });
    } finally {
      uploading = 0;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: Event) => void upload(String((e as CustomEvent).detail ?? "null"));
    document.addEventListener("fepass:grades", handler);
    document.dispatchEvent(new CustomEvent("fepass:grades-request"));
    return () => document.removeEventListener("fepass:grades", handler);
  }, [enabled, upload]);
}

/** Trả lời popup của tiện ích sau khi xử lý lệnh bật/tắt */
export const replySetSync = (result: { ok: boolean; enabled?: boolean; error?: string }) =>
  document.dispatchEvent(new CustomEvent("fepass:set-sync-result", { detail: JSON.stringify(result) }));
