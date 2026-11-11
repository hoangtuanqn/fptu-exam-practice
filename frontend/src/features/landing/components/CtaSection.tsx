import { Link } from "react-router-dom";
import { brand, logos } from "@/shared/brand/brand";
import { buttonClass } from "@/shared/ui/Button";
import { DARK_GOLD, GOLD_BUTTON } from "@/shared/ui/gold";
import { useSignupGift } from "../useSignupGift";

// Khối cuối trang mời đăng ký: nền vàng sẫm cùng linh vật (khớp với đầu và cuối trang Pro), một nút chính vàng bóng và một nút phụ viền
export function CtaSection() {
  const { bonus, hasGift } = useSignupGift();
  return (
    <section className="bg-surface px-5 py-12 sm:py-20">
      <div className={`relative mx-auto max-w-3xl overflow-hidden rounded-m3-xl px-6 py-12 text-center ring-1 ring-[#ffc61f]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_28px_60px_-24px_rgba(0,0,0,0.5)] sm:px-10 ${DARK_GOLD}`}>
        <div aria-hidden className="pro-glow absolute -top-20 left-1/2 h-48 w-80 -translate-x-1/2 rounded-full bg-[#ffc61f]/30 blur-3xl" />
        <div aria-hidden className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]" />
        <img src={logos.mark} alt="" className="pro-float relative mx-auto h-20 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" draggable={false} />
        <p className="md-label-large relative mt-3 uppercase tracking-widest text-[#ffc61f]">{brand.slogan}</p>
        <h2 className="md-section-title relative mt-3">
          Sẵn sàng chạm <span className="italic text-[#ffc61f]">điểm 10</span>?
        </h2>
        <p className="md-body-large relative mx-auto mt-4 max-w-md text-[#fff6dc]/85">
          {hasGift ? `Đăng ký miễn phí, nhận ${bonus.toLocaleString("vi-VN")} credit để lấy đề đầu tiên.` : "Đăng ký miễn phí, mất vài giây."} Đề đã lấy về thì luyện bao nhiêu lần cũng được.
        </p>
        <p className="md-body-small relative mx-auto mt-2 max-w-md text-[#fff6dc]/65">Lấy đề và xem giải thích AI từng câu có tính phí, giá luôn hiện rõ trước khi bạn bấm.</p>

        <div className="relative mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/register" className={`pro-cta md-label-large inline-flex h-12 items-center justify-center rounded-full px-8 text-base font-extrabold transition-transform hover:scale-[1.03] active:scale-[0.98] ${GOLD_BUTTON}`}>
            Tạo tài khoản miễn phí
          </Link>
          <Link to="/login" className={buttonClass({ variant: "outlined", className: "!h-12 !px-8 text-base !border-[#ffc61f]/60 !text-[#ffe58a]" })}>
            Đăng nhập
          </Link>
        </div>

        <ul className="md-label-large relative mt-6 flex flex-wrap justify-center gap-x-5 gap-y-1 font-normal text-[#fff6dc]/70">
          {["Chấm điểm thang 10", "Lưu lịch sử từng lần làm"].map((t) => (
            <li key={t} className="inline-flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-[#ffc61f]" />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
