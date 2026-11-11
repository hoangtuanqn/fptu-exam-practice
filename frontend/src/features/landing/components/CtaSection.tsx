import { Link } from "react-router-dom";
import { brand } from "@/shared/brand/brand";
import { buttonClass } from "@/shared/ui/Button";
import { useSignupGift } from "../useSignupGift";

// Khối cuối trang mời đăng ký: một hành động chính (nút filled) và một hành động phụ (nút outlined)
export function CtaSection() {
  const { bonus, hasGift } = useSignupGift();
  return (
    <section className="bg-surface px-5 py-12 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="md-label-large uppercase tracking-widest text-primary">{brand.slogan}</p>
        <h2 className="md-section-title mt-3 text-on-surface">
          Sẵn sàng chạm <span className="italic text-primary">điểm 10</span>?
        </h2>
        <p className="md-body-large mx-auto mt-4 max-w-md text-on-surface-variant">
          {hasGift ? `Đăng ký miễn phí, nhận ${bonus.toLocaleString("vi-VN")} credit để lấy đề đầu tiên.` : "Đăng ký miễn phí, mất vài giây."} Đề đã lấy về thì luyện bao nhiêu lần cũng được.
        </p>
        <p className="md-body-small mx-auto mt-2 max-w-md text-on-surface-variant">Lấy đề và xem giải thích AI từng câu có tính phí, giá luôn hiện rõ trước khi bạn bấm.</p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/register" className={buttonClass({ variant: "filled", className: "!h-12 !px-8 text-base" })}>
            Tạo tài khoản miễn phí
          </Link>
          <Link to="/login" className={buttonClass({ variant: "outlined", className: "!h-12 !px-8 text-base" })}>
            Đăng nhập
          </Link>
        </div>

        <ul className="md-label-large mt-6 flex flex-wrap justify-center gap-x-5 gap-y-1 font-normal text-on-surface-variant">
          {["Chấm điểm thang 10", "Lưu lịch sử từng lần làm"].map((t) => (
            <li key={t} className="inline-flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-primary" />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
