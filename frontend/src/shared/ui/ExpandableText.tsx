import { useLayoutEffect, useRef, useState } from "react";

interface Props {
  text: string;
  lines?: number; // số dòng hiện khi thu gọn
  className?: string;
}

/**
 * Văn bản dài trong bảng/danh sách: thu gọn thành vài dòng, KHÔNG bị cắt mất.
 * Chỉ khi nội dung thực sự dài hơn số dòng cho phép mới hiện nút "Xem thêm"; bấm để mở hết, bấm lại để thu gọn.
 * (Thay cho `truncate` + tooltip: tooltip chỉ hiện khi rê chuột, không dùng được trên điện thoại hay bàn phím.)
 */
export function ExpandableText({ text, lines = 2, className = "" }: Props) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [clamped, setClamped] = useState(false);

  // Đo xem nội dung có bị cắt không (đo lại khi đổi chữ hoặc khi cột đổi độ rộng)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      if (!open) setClamped(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, lines, open]);

  return (
    <div className={className}>
      <p
        ref={ref}
        className="whitespace-pre-wrap break-words"
        style={open ? undefined : { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: lines, overflow: "hidden" }}
      >
        {text}
      </p>
      {(clamped || open) && (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="md-label-small mt-0.5 font-medium text-primary hover:underline">
          {open ? "Thu gọn" : "Xem thêm"}
        </button>
      )}
    </div>
  );
}
