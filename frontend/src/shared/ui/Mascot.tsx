import { MASCOT_SVG } from "./mascot-art";

/**
 * Linh vật Cóc Pass nhảy dọc mép dưới màn hình (hình vẽ ở mascot-art.ts).
 * Chỉ dùng CSS animation trên transform (chạy ở compositor, không làm layout lại, không có JS chạy theo frame),
 * pointer-events: none nên không chặn thao tác. Người bật "giảm chuyển động" chỉ thấy cóc ngồi yên.
 */
export function Mascot() {
  return (
    <div aria-hidden="true" className="mascot print:hidden">
      <div className="mascot-travel">
        <div className="mascot-hop" dangerouslySetInnerHTML={{ __html: MASCOT_SVG }} />
      </div>
    </div>
  );
}
