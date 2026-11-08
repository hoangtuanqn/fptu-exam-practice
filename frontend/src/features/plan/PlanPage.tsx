import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BadgeCheck, CalendarClock, Check, ChevronDown, Crown, Download, Link2, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useToast } from "@/shared/context/ToastContext";
import { examImportApi } from "@/features/exam-import/exam-import.api";
import { VerifyEmailNotice } from "@/features/verify-email/VerifyEmailNotice";
import { brand, logos } from "@/shared/brand/brand";
import { Logo } from "@/shared/brand/Logo";
import { useApi } from "@/shared/hooks/useApi";
import { useCountUp } from "@/shared/hooks/useCountUp";
import { Footer } from "@/shared/layout/Footer";
import { UserMenu } from "@/shared/layout/UserMenu";
import { ErrorBox, Loading } from "@/shared/ui/Feedback";
import { formatDate } from "@/shared/utils/formatters";
import { addMonths, isPro, proDaysLeft } from "@/shared/utils/pro";
import { planApi, type PlanInfo } from "./plan.api";
import { UpgradeDialog } from "./UpgradeDialog";

const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const GOLD = "bg-gradient-to-b from-[#ffd75e] to-[#f0a800] text-[#3a2600]";

const FAQ: [string, string][] = [
  ["Mình trả bằng gì?", "Bằng credit trong ví (1 credit = 1đ). Chưa đủ thì nạp thêm bằng chuyển khoản, xong là quay lại nâng cấp được ngay."],
  ["Pro có tự động gia hạn không?", "Không. Bạn trả một lần cho đủ thời hạn, hết hạn là trở về dùng bình thường và không bị trừ thêm đồng nào."],
  ["Mua khi Pro còn hạn thì sao?", "Thời gian được cộng dồn vào hạn hiện tại, không mất ngày nào."],
  ["Hết hạn Pro thì mình mất gì không?", "Không mất gì. Đề đã lấy vẫn nằm trong kho, lời giải đã xem vẫn xem lại được. Chỉ là lần lấy đề mới sẽ tính phí như thường."],
];

// Trang bán hàng gói Pro (công khai). Nền tối vàng cố định (không đổi theo giao diện sáng/tối) để chữ vàng/trắng luôn đủ tương phản.
export default function PlanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const info = useApi(() => planApi.info(), []);
  const fetchPrice = useApi(() => examImportApi.price(), []).data?.price ?? 0;
  const [open, setOpen] = useState(false);

  const pro = isPro(user);
  const unverified = !!user && !user.emailVerifiedAt;
  const plan = info.data;
  // Chữ nút theo ngữ cảnh: khách được báo trước sẽ phải đăng nhập (đỡ bất ngờ), người đang là Pro thấy "Gia hạn"
  const label = !user ? "Đăng nhập để nâng cấp Pro" : pro ? "Gia hạn Pro" : "Nâng cấp Pro ngay";

  const cta = () => {
    if (!user) return navigate("/login", { state: { from: "/pro" } });
    if (unverified) {
      toast.error("Hãy xác minh email trước khi nâng cấp Pro. Mình đã đưa bạn tới mục xác minh bên dưới.");
      return document.getElementById("pro-verify")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setOpen(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-outline-variant bg-surface/90 px-3 backdrop-blur sm:px-4">
        <Link to="/" title={brand.company}>
          <Logo variant="full" className="h-10" />
        </Link>
        <UserMenu />
      </header>

      <main className="flex-1 pb-24 expanded:pb-0">
        {info.loading ? (
          <Loading />
        ) : info.error || !plan ? (
          <div className="mx-auto max-w-xl p-6">
            <ErrorBox message={info.error ?? "Không tải được thông tin gói"} onRetry={info.reload} />
          </div>
        ) : (
          <>
            <Hero plan={plan} pro={pro} label={label} daysLeft={proDaysLeft(user)} expiresAt={user?.proExpiresAt ?? null} onBuy={cta} />
            {unverified && (
              <div id="pro-verify" className="mx-auto max-w-3xl px-4 pt-6">
                <VerifyEmailNotice variant="inline" message="Bạn cần xác minh email trước khi nâng cấp Pro." />
              </div>
            )}
            <Compare plan={plan} />
            <Benefits plan={plan} fetchPrice={fetchPrice} />
            <Faq />
            <FinalCta plan={plan} label={label} onBuy={cta} />
          </>
        )}
      </main>

      {plan && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#ffc61f]/30 bg-[#1d1500]/95 px-4 py-3 backdrop-blur expanded:hidden">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-xs text-[#fff1c2]/70 line-through">{vnd(plan.fuoPrice)}</div>
              <div className="text-lg font-extrabold tabular-nums text-[#ffc61f]">{vnd(plan.price)}</div>
            </div>
            <button onClick={cta} className={`pro-cta md-label-large inline-flex h-12 items-center gap-2 rounded-full px-6 font-bold shadow-m3-2 ${GOLD}`}>
              <Crown size={18} /> {label}
            </button>
          </div>
        </div>
      )}

      <Footer />
      <div aria-hidden className="h-20 expanded:hidden" /> {/* chừa chỗ cho thanh mua cố định ở đáy (mobile) để không che chân trang */}
      {open && plan && <UpgradeDialog plan={plan} onClose={() => setOpen(false)} />}
    </div>
  );
}

function Hero({ plan, pro, label, daysLeft, expiresAt, onBuy }: { plan: PlanInfo; pro: boolean; label: string; daysLeft: number; expiresAt: string | null; onBuy: () => void }) {
  const price = useCountUp(plan.price, 1100);
  const newExpiry = addMonths(pro && expiresAt ? new Date(expiresAt) : new Date(), plan.months);
  return (
    <section className="relative isolate overflow-hidden bg-[radial-gradient(ellipse_at_top,#5a4100_0%,#2a1d00_48%,#140e00_100%)] text-[#fff6dc]">
      <div aria-hidden className="pro-glow absolute -right-24 -top-24 -z-10 h-96 w-96 rounded-full bg-[#ffc61f]/30 blur-3xl" />
      <div aria-hidden className="pro-glow absolute -bottom-32 -left-24 -z-10 h-80 w-80 rounded-full bg-[#ff8a3d]/20 blur-3xl [animation-delay:1.5s]" />
      <div aria-hidden className="absolute inset-0 -z-10 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]" />

      <div className="mx-auto grid max-w-5xl items-center gap-8 px-5 py-12 expanded:grid-cols-[1.15fr_0.85fr] expanded:py-20">
        <div className="pro-rise text-center expanded:text-left">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${GOLD}`}>
            <Crown size={13} strokeWidth={2.6} /> Gói Pro · duy nhất một cấp
          </span>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
            Học thả ga <span className="bg-gradient-to-r from-[#ffe58a] via-[#ffc61f] to-[#ff9d2f] bg-clip-text text-transparent">{plan.months} tháng</span>,
            <br className="hidden sm:block" /> không lo trừ credit
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-[#fff6dc]/80 expanded:mx-0">
            Lấy đề, xem giải thích AI từng câu và tải đề PE <b className="text-white">hoàn toàn miễn phí</b> trong suốt thời hạn Pro.
          </p>

          <div className="mt-7 flex flex-col items-center gap-2 expanded:items-start">
            <div className="flex items-center gap-2 text-sm text-[#fff6dc]/70">
              <span>FuOverflow VIP {plan.months} tháng</span>
              <span className="text-lg font-semibold tabular-nums line-through decoration-[#ff6b6b] decoration-2">{vnd(plan.fuoPrice)}</span>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-6xl font-black tabular-nums leading-none tracking-tight text-[#ffc61f] drop-shadow-[0_4px_24px_rgba(255,198,31,0.45)] sm:text-7xl">{vnd(price)}</span>
              <span className="mb-2 rounded-full bg-[#ff4d4d] px-2.5 py-1 text-xs font-extrabold text-white shadow-lg">-{plan.savingsPercent}%</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 expanded:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ffc61f]/50 bg-[#ffc61f]/15 px-3 py-1.5 text-sm font-bold text-[#ffe58a]">
                <BadgeCheck size={16} /> Tiết kiệm {vnd(plan.savings)} so với mua trên FuOverflow
              </span>
              <span className="text-sm text-[#fff6dc]/70">≈ {vnd(plan.pricePerMonth)}/tháng</span>
            </div>
          </div>

          {pro && (
            <p className="mx-auto mt-5 inline-flex max-w-md items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-sm expanded:mx-0">
              <CalendarClock size={18} className="shrink-0 text-[#ffc61f]" />
              <span>
                Bạn đang là Pro, còn <b className="text-[#ffc61f]">{daysLeft} ngày</b> (đến {expiresAt ? formatDate(expiresAt) : ""}).
              </span>
            </p>
          )}

          <div className="mt-6 flex flex-col items-center gap-3 expanded:items-start">
            <button onClick={onBuy} className={`pro-cta md-label-large inline-flex h-14 items-center gap-2.5 rounded-full px-9 text-base font-extrabold shadow-[0_10px_40px_-6px_rgba(255,198,31,0.6)] transition-transform hover:scale-[1.03] active:scale-[0.98] ${GOLD}`}>
              <Crown size={20} strokeWidth={2.4} />
              {pro ? `Gia hạn thêm ${plan.months} tháng` : label}
              <ArrowRight size={18} />
            </button>
            <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-[#fff6dc]/65 expanded:justify-start">
              <span className="inline-flex items-center gap-1"><ShieldCheck size={13} /> Trả một lần</span>
              <span className="inline-flex items-center gap-1"><Check size={13} /> Không tự gia hạn</span>
              <span className="inline-flex items-center gap-1"><Wallet size={13} /> Dùng credit trong ví</span>
            </p>
            {pro && <p className="text-xs text-[#fff6dc]/65">Gia hạn xong, Pro đến {formatDate(newExpiry.toISOString())}.</p>}
          </div>
        </div>

        <div className="pro-rise relative mx-auto hidden w-full max-w-xs [animation-delay:150ms] expanded:block">
          <div aria-hidden className="pro-glow absolute inset-6 rounded-full bg-[#ffc61f]/40 blur-2xl" />
          <div className="pro-float relative">
            <img src={logos.mark} alt="" className="relative mx-auto w-56 drop-shadow-[0_18px_30px_rgba(0,0,0,0.5)]" draggable={false} />
            <Crown size={74} strokeWidth={1.6} className="absolute -top-8 left-1/2 -translate-x-1/2 -rotate-6 fill-[#ffc61f] text-[#ffe58a] drop-shadow-[0_6px_14px_rgba(255,198,31,0.6)]" />
          </div>
          <div className="absolute -left-3 top-16 rotate-[-6deg] rounded-xl bg-white px-3 py-1.5 text-sm font-extrabold text-[#3a2600] shadow-xl">-{vnd(plan.savings)}</div>
          <div className="absolute -right-2 bottom-14 rotate-[5deg] rounded-xl bg-[#ff4d4d] px-3 py-1.5 text-sm font-extrabold text-white shadow-xl">{plan.months} tháng</div>
        </div>
      </div>
    </section>
  );
}

// So sánh trực quan: hai thanh dài theo giá, thanh Pro ngắn hơn rõ rệt và vàng nổi bật
function Compare({ plan }: { plan: PlanInfo }) {
  const ratio = plan.fuoPrice > 0 ? plan.price / plan.fuoPrice : 1;
  return (
    <section className="mx-auto max-w-3xl px-4 pt-12">
      <h2 className="md-headline-small text-center text-on-surface">Cùng {plan.months} tháng, bạn giữ lại <span className="text-primary">{vnd(plan.savings)}</span></h2>
      <div className="mt-6 space-y-4 rounded-m3-lg border border-outline-variant bg-surface-container-low p-5">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="text-on-surface-variant">FuOverflow VIP · {plan.months} tháng</span>
            <b className="tabular-nums text-on-surface">{vnd(plan.fuoPrice)}</b>
          </div>
          <div className="h-5 overflow-hidden rounded-full bg-surface-container-highest">
            <div className="pro-bar h-full w-full rounded-full bg-outline" />
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold text-on-surface">
              <Crown size={15} className="text-primary" /> FEPass Pro · {plan.months} tháng
            </span>
            <b className="tabular-nums text-primary">{vnd(plan.price)}</b>
          </div>
          <div className="h-5 overflow-hidden rounded-full bg-surface-container-highest">
            <div className="pro-bar h-full rounded-full bg-gradient-to-r from-[#ffd75e] to-[#f0a800] [animation-delay:0.55s]" style={{ width: `${Math.max(8, ratio * 100)}%` }} />
          </div>
        </div>
        <p className="flex items-center justify-center gap-2 rounded-xl bg-primary-container px-3 py-2 text-center text-sm font-semibold text-on-primary-container">
          <BadgeCheck size={17} /> Rẻ hơn {plan.savingsPercent}%, mà còn có giải thích AI và tải đề PE
        </p>
      </div>
    </section>
  );
}

function Benefits({ plan, fetchPrice }: { plan: PlanInfo; fetchPrice: number }) {
  const items = [
    plan.benefits.freeFetch && {
      icon: Link2,
      title: "Lấy đề không giới hạn",
      text: fetchPrice > 0 ? `Dán link FuOverflow là có đề, không mất ${vnd(fetchPrice)}/đề như thường.` : "Dán link FuOverflow là có đề, không bị tính phí.",
    },
    plan.benefits.freeExplain && { icon: Sparkles, title: "Giải thích AI mọi câu", text: "Bấm xem lời giải của bất kỳ câu nào, không cần mở khóa từng đề." },
    plan.benefits.freePe && { icon: Download, title: "Tải đề PE miễn phí", text: "Tải trọn bộ tài nguyên đề PE (file zip) mà không bị trừ credit." },
  ].filter(Boolean) as { icon: typeof Link2; title: string; text: string }[];
  return (
    <section className="mx-auto max-w-5xl px-4 pt-14">
      <h2 className="md-headline-small text-center text-on-surface">Mọi thứ mở khóa khi bạn lên Pro</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {items.map(({ icon: Icon, title, text }, i) => (
          <div key={title} className="pro-rise rounded-m3-lg border border-outline-variant bg-surface-container-lowest p-5 transition hover:-translate-y-0.5 hover:shadow-m3-2" style={{ animationDelay: `${i * 90}ms` }}>
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-m3-1 ${GOLD}`}>
              <Icon size={24} strokeWidth={2.2} />
            </span>
            <h3 className="md-title-medium mt-4 text-on-surface">{title}</h3>
            <p className="md-body-medium mt-1 text-on-surface-variant">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-14">
      <h2 className="md-headline-small text-center text-on-surface">Câu hỏi thường gặp</h2>
      <div className="mt-5 divide-y divide-outline-variant overflow-hidden rounded-m3-md border border-outline-variant bg-surface-container-lowest">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group">
            <summary className="md-state md-title-small flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-on-surface [&::-webkit-details-marker]:hidden">
              {q}
              <ChevronDown size={18} className="shrink-0 text-on-surface-variant transition group-open:rotate-180" />
            </summary>
            <p className="md-body-medium px-4 pb-4 text-on-surface-variant">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCta({ plan, label, onBuy }: { plan: PlanInfo; label: string; onBuy: () => void }) {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-14">
      <div className="relative overflow-hidden rounded-m3-xl bg-[radial-gradient(ellipse_at_top,#5a4100_0%,#1d1500_100%)] px-6 py-9 text-center text-[#fff6dc]">
        <div aria-hidden className="pro-glow absolute -top-16 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-[#ffc61f]/30 blur-3xl" />
        <Crown size={34} className="relative mx-auto text-[#ffc61f]" />
        <h2 className="relative mt-2 text-2xl font-extrabold">Sẵn sàng học không giới hạn?</h2>
        <p className="relative mt-1.5 text-sm text-[#fff6dc]/75">
          {vnd(plan.price)} cho {plan.months} tháng, tiết kiệm {vnd(plan.savings)} so với FuOverflow VIP.
        </p>
        <button onClick={onBuy} className={`pro-cta md-label-large relative mt-5 inline-flex h-12 items-center gap-2 rounded-full px-8 font-extrabold shadow-[0_10px_36px_-6px_rgba(255,198,31,0.55)] ${GOLD}`}>
          <Crown size={18} /> {label}
        </button>
      </div>
    </section>
  );
}
