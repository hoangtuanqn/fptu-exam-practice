import { useEffect, useRef, useState } from "react";
import { engineOf, isSafeDot } from "./dot";

type Phase = "loading" | "ready" | "failed";

const RENDER_TIMEOUT_MS = 8000;

// Thư viện Graphviz (WASM, vài MB) chỉ được tải khi thật sự có một đồ thị để vẽ, và chỉ tải một lần: người dùng chưa từng gặp
// đồ thị không tốn thêm byte nào, bản dựng chính cũng không phình ra.
let vizPromise: Promise<import("@viz-js/viz").Viz> | null = null;
const loadViz = () => (vizPromise ??= import("@viz-js/viz").then((m) => m.instance()).catch((err) => {
  vizPromise = null; // lần sau thử tải lại
  throw err;
}));

const withTimeout = <T,>(p: Promise<T>) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Vẽ đồ thị quá lâu")), RENDER_TIMEOUT_MS))]);

const FONT = "Inter, sans-serif";

/**
 * Vẽ một đồ thị viết bằng ngôn ngữ DOT thành SVG, đặt trong lời giải thích. Thiết kế để không ảnh hưởng trải nghiệm:
 * - Lời giải hiện ngay; đồ thị chiếm sẵn một khung có chiều cao cố định rồi mới thay bằng hình (không làm trang nhảy).
 * - Vẽ nền, không chặn thao tác nào; lỗi thì chỉ hiện mã DOT dạng văn bản thu gọn, phần còn lại của lời giải vẫn đầy đủ.
 * - SVG được dựng thành phần tử DOM (không chèn chuỗi HTML) và nguồn DOT đã được kiểm tra trước khi vẽ.
 */
export function DotGraph({ source }: { source: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    if (!isSafeDot(source)) {
      setPhase("failed");
      return;
    }
    void (async () => {
      try {
        const viz = await withTimeout(loadViz());
        const svg = viz.renderSVGElement(source, {
          engine: engineOf(source), // neato + pos="x,y!" giữ đúng vị trí các đỉnh như trong ảnh đề
          graphAttributes: { bgcolor: "transparent", fontname: FONT },
          nodeAttributes: { shape: "circle", fontname: FONT, fontsize: "13", color: "#334155", fontcolor: "#0f172a" },
          edgeAttributes: { fontname: FONT, fontsize: "12", color: "#475569", fontcolor: "#0f172a" },
        });
        if (cancelled || !host.current) return;
        // Co theo bề ngang khung thay vì kích thước cố định của Graphviz
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute("role", "img");
        svg.style.maxWidth = "100%";
        svg.style.height = "auto";
        svg.style.maxHeight = "20rem";
        host.current.replaceChildren(svg);
        setPhase("ready");
      } catch {
        if (!cancelled) setPhase("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source]);

  return (
    <figure className="mb-3 last:mb-0" aria-label="Đồ thị minh hoạ">
      {phase !== "failed" && (
        <div aria-busy={phase === "loading"} className="relative flex min-h-40 items-center justify-center overflow-x-auto rounded-lg border border-slate-200 bg-surface-container-lowest p-3">
          {/* Khung vẽ do DOM quản lý (SVG được chèn vào đây), không có con nào do React quản lý */}
          <div ref={host} className="flex w-full justify-center" />
          {phase === "loading" && <span className="absolute animate-pulse text-xs text-slate-400">Đang vẽ đồ thị…</span>}
        </div>
      )}
      <details open={phase === "failed"} className="mt-1.5 text-xs text-slate-500">
        <summary className="cursor-pointer select-none hover:text-slate-700">{phase === "failed" ? "Không vẽ được đồ thị. Xem mô tả (DOT)" : "Xem mã DOT"}</summary>
        <pre className="mt-1.5 overflow-x-auto whitespace-pre rounded-lg bg-slate-900 p-3 text-[12px] leading-relaxed text-slate-100">{source}</pre>
      </details>
    </figure>
  );
}
