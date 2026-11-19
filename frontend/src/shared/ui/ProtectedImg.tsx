import { forwardRef, useCallback, useEffect, useState, type ImgHTMLAttributes, type Ref } from "react";
import { fetchImageBlob } from "@/shared/api/protectedImage";

const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"; // 1x1 trong suốt, giữ chỗ cho thẻ ảnh khi chưa có nội dung

/**
 * Thay cho <img> ở mọi chỗ hiện ảnh đề: tải bằng fetch có danh tính rồi hiển thị bằng blob (xem protectedImage.ts).
 * Chuột phải vẫn dùng bình thường (chặn chỉ gây khó chịu, không ngăn được ai). `loading="lazy"` vẫn có nghĩa: chỉ tải khi ảnh sắp vào màn hình.
 * shortcut: người rành kỹ thuật vẫn lấy được ảnh qua tab Network khi đang đăng nhập; chặn hẳn là bất khả thi với ảnh đã hiển thị.
 */
export const ProtectedImg = forwardRef<HTMLImageElement, ImgHTMLAttributes<HTMLImageElement>>(function ProtectedImg(
  { src, loading, style, className, onLoad, onError, ...rest },
  ref,
) {
  const [node, setNode] = useState<HTMLImageElement | null>(null);
  const [near, setNear] = useState(loading !== "lazy"); // lazy: chờ tới gần màn hình mới tải
  // Ảnh đang hiển thị và nó thuộc src nào: khi đổi src giữ nguyên khung ảnh cũ (ẩn đi) tới lúc ảnh mới về, để bố cục không nhảy và không hiện nhầm ảnh câu trước
  const [shown, setShown] = useState<{ url: string; of: string } | null>(null);
  const blobUrl = shown && shown.of === src ? shown.url : null;

  const setRef = useCallback(
    (el: HTMLImageElement | null) => {
      setNode(el);
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as { current: HTMLImageElement | null }).current = el;
    },
    [ref],
  );

  useEffect(() => {
    if (near || !node) return;
    if (typeof IntersectionObserver === "undefined") return setNear(true);
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: "400px" });
    io.observe(node);
    return () => io.disconnect();
  }, [near, node]);

  useEffect(() => {
    if (!src || !near) return;
    if (/^(blob|data):/.test(src)) return setShown({ url: src, of: src }); // đề mở từ thư mục máy: ảnh đã ở trình duyệt, không qua máy chủ
    let alive = true;
    let made: string | null = null;
    fetchImageBlob(src)
      .then((blob) => {
        if (!alive) return;
        made = URL.createObjectURL(blob);
        setShown({ url: made, of: src });
      })
      .catch(() => alive && onError?.(new Event("error") as never));
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, near]);

  return (
    <img
      {...rest}
      ref={setRef as Ref<HTMLImageElement>}
      src={shown?.url ?? BLANK}
      draggable={false}
      onLoad={blobUrl ? onLoad : undefined}
      onError={blobUrl ? onError : undefined}
      aria-busy={!blobUrl}
      className={`select-none ${className ?? ""}`}
      // Chưa có ảnh thì giữ một khoảng trống: nếu không, ảnh lazy xẹp còn 1px và mọi ảnh cùng "vào màn hình" một lúc
      style={blobUrl ? style : shown ? { ...style, visibility: "hidden" } : { minHeight: loading === "lazy" ? "10rem" : undefined, ...style }}
    />
  );
});
