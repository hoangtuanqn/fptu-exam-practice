import { useCallback, useEffect, useState } from "react";
import { gradeApi, type ExtensionGrades } from "./grade.api";

// Cầu nối với tiện ích Chrome FePass (chrome-extension/site.js):
//  - website công bố công tắc đồng bộ qua data-fepass-grade-sync để tiện ích biết có được đọc điểm FAP không;
//  - tiện ích trả điểm đã đọc qua sự kiện "fepass:grades" (chuỗi JSON); website tự gửi lên tài khoản đang đăng nhập.
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

export function useGradeBridge(enabled: boolean, onUploaded: () => void) {
  const [version, setVersion] = useState(() => document.documentElement.dataset.fepassExt ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const check = () => setVersion(root.dataset.fepassExt ?? "");
    const mo = new MutationObserver(check);
    mo.observe(root, { attributes: true, attributeFilter: ["data-fepass-ext"] });
    return () => mo.disconnect();
  }, []);

  // Công bố công tắc cho tiện ích
  useEffect(() => {
    document.documentElement.dataset.fepassGradeSync = enabled ? "on" : "off";
  }, [enabled]);

  const upload = useCallback(
    async (raw: string) => {
      let data: ExtensionGrades | null = null;
      try {
        data = JSON.parse(raw) as ExtensionGrades | null;
      } catch {
        return;
      }
      if (!data || !Array.isArray(data.courses) || data.courses.length === 0 || data.at <= readUploaded()) return;
      try {
        await gradeApi.sync(data.courses);
        try {
          localStorage.setItem(UPLOADED_KEY, String(data.at));
        } catch {
          /* bỏ qua: lần sau sẽ gửi lại, server ghi đè nên không sao */
        }
        setError(null);
        onUploaded();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chưa gửi được điểm lên tài khoản");
      }
    },
    [onUploaded],
  );

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: Event) => void upload(String((e as CustomEvent).detail ?? "null"));
    document.addEventListener("fepass:grades", handler);
    document.dispatchEvent(new CustomEvent("fepass:grades-request"));
    return () => document.removeEventListener("fepass:grades", handler);
  }, [enabled, upload]);

  return { installed: !!version, outdated: !!version && isNewer(MIN_EXTENSION, version), error };
}
