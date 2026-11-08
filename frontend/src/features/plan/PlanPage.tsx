import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CalendarClock,
  Check,
  ChevronDown,
  Crown,
  Download,
  FileDown,
  History,
  Infinity as InfinityIcon,
  Link2,
  MessageCircleQuestion,
  Minus,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { examImportApi } from "@/features/exam-import/exam-import.api";
import { VerifyEmailNotice } from "@/features/verify-email/VerifyEmailNotice";
import { brand, logos } from "@/shared/brand/brand";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useCountUp } from "@/shared/hooks/useCountUp";
import { Footer } from "@/shared/layout/Footer";
import { SiteHeader } from "@/shared/layout/SiteHeader";
import { ErrorBox, Loading } from "@/shared/ui/Feedback";
import { formatDate } from "@/shared/utils/formatters";
import { addMonths, isPro, proDaysLeft } from "@/shared/utils/pro";
import { planApi, type PlanInfo } from "./plan.api";
import { UpgradeDialog } from "./UpgradeDialog";

const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const GOLD = "bg-gradient-to-b from-[#ffd75e] to-[#f0a800] text-[#3a2600]";

const FAQ: [string, string][] = [
  ["Mình trả bằng gì?", "Bằng credit trong ví (1 credit = 1đ). Chưa đủ thì nạp thêm bằng chuyển khoản, xong là quay lại nâng cấp được ngay."],
  ["Pro có giới hạn lượt dùng không?", "Không. Trong thời hạn Pro, bạn lấy đề, xem giải thích AI và nhờ AI giải đề bao nhiêu lần cũng được, không bị trừ credit và không bị giới hạn số lượt mỗi giờ."],
  ["Pro có tự động gia hạn không?", "Không. Bạn trả một lần cho đủ thời hạn, hết hạn là trở về dùng bình thường và không bị trừ thêm đồng nào."],
  ["Mua khi Pro còn hạn thì sao?", "Thời gian được cộng dồn vào hạn hiện tại, không mất ngày nào."],
  ["Hết hạn Pro thì mình mất gì không?", "Không mất gì. Đề đã lấy vẫn nằm trong kho, lời giải đã xem vẫn xem lại được. Chỉ là lần lấy đề mới sẽ tính phí như thường."],
];

// Tính năng do FEPass xây thêm trên kho đề (cột FuOverflow VIP: chỉ dòng đầu có, các dòng còn lại là tính năng riêng của FEPass)
const FEATURES: { icon: typeof Bot; text: string; fuo: boolean }[] = [
  { icon: Link2, text: "Xem đề thi FE đầy đủ từ kho FuOverflow", fuo: true },
  { icon: Bot, text: "AI giải đáp án cho cả đề, kèm đối chiếu bình luận", fuo: false },
  { icon: Sparkles, text: "Giải thích AI từng câu, nói rõ vì sao sai", fuo: false },
  { icon: History, text: "Chấm điểm thang 10, lưu lịch sử và điểm cao nhất", fuo: false },
  { icon: Timer, text: "Chế độ Thi có đếm ngược, tự nộp khi hết giờ", fuo: false },
  { icon: FileDown, text: "Tải trọn bộ tài nguyên đề PE (file zip)", fuo: false },
  { icon: MessageCircleQuestion, text: "Trợ lý Cóc Pass trả lời mọi lúc", fuo: false },
  { icon: InfinityIcon, text: "Không giới hạn lượt lấy đề, giải thích, AI giải đề", fuo: false },
];

// Hiện dần khi cuộn tới (người bật "giảm chuyển động" thấy ngay)
function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setShown(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`transition-all duration-700 ease-out ${shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"} ${className}`}>
      {children}
    </div>
  );
}

// Trang bán gói Pro (công khai). Phần nền tối vàng dùng màu cố định (không đổi theo giao diện sáng/tối) để chữ vàng/trắng luôn đủ tương phản.
export default function PlanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const info = useApi(() => planApi.info(), []);
  const fetchPrice = useApi(() => examImportApi.price(), []).data?.price ?? 0;
  const [open, setOpen] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);

  const pro = isPro(user);
  const unverified = !!user && !user.emailVerifiedAt;
  const plan = info.data;
  // Chữ nút theo ngữ cảnh: khách được báo trước sẽ phải đăng nhập (đỡ bất ngờ), người đang là Pro thấy "Gia hạn"
  const label = !user ? "Đăng nhập để nâng cấp Pro" : pro ? "Gia hạn Pro" : "Nâng cấp Pro ngay";

  // Thanh mua nổi: chỉ hiện khi đã cuộn qua phần đầu (nút chính không còn trong tầm mắt)
  useEffect(() => {
    const el = heroRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setHeroVisible(!!e?.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [plan]);

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
      <SiteHeader />

      <main className="flex-1 pb-20">
        {info.loading ? (
          <Loading />
        ) : info.error || !plan ? (
          <div className="mx-auto max-w-xl p-6">
            <ErrorBox message={info.error ?? "Không tải được thông tin gói"} onRetry={info.reload} />
          </div>
        ) : (
          <>
            <div ref={heroRef}>
              <Hero plan={plan} pro={pro} label={label} daysLeft={proDaysLeft(user)} expiresAt={user?.proExpiresAt ?? null} onBuy={cta} />
            </div>
            {unverified && (
              <div id="pro-verify" className="mx-auto max-w-3xl px-4 pt-6">
                <VerifyEmailNotice variant="inline" message="Bạn cần xác minh email trước khi nâng cấp Pro." />
              </div>
            )}
            <Unlimited />
            <Compare plan={plan} />
            <FeatureTable plan={plan} />
            <Benefits plan={plan} fetchPrice={fetchPrice} />
            <Steps plan={plan} />
            <Faq />
            <FinalCta plan={plan} label={label} onBuy={cta} />
          </>
        )}
      </main>

      {/* Chân trang: nền liền với footer nên phần đệm cho thanh mua nổi (mobile) không lộ thành một dải trống bên dưới */}
      <div className="bg-surface-container-low pb-[84px] expanded:pb-0">
        <Footer />
      </div>

      {plan && !heroVisible && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-3 expanded:bottom-5 expanded:left-1/2 expanded:right-auto expanded:w-[34rem] expanded:-translate-x-1/2 expanded:px-0 expanded:pb-0">
          <div className="pro-rise flex items-center gap-3 rounded-full border border-[#ffc61f]/40 bg-[#1d1500]/95 py-2 pl-5 pr-2 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)] backdrop-blur">
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-xs text-[#fff6dc]/70">
                <span className="line-through">{vnd(plan.fuoPrice)}</span> · tiết kiệm {vnd(plan.savings)}
              </div>
              <div className="text-lg font-extrabold tabular-nums text-[#ffc61f]">
                {vnd(plan.price)} <span className="text-xs font-semibold text-[#fff6dc]/70">/ {plan.months} tháng</span>
              </div>
            </div>
            <button onClick={cta} className={`pro-cta md-label-large inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-5 font-extrabold ${GOLD}`}>
              <Crown size={17} /> {pro ? "Gia hạn" : user ? "Nâng cấp" : "Đăng nhập"}
            </button>
          </div>
        </div>
      )}

      {open && plan && <UpgradeDialog plan={plan} onClose={() => setOpen(false)} />}
    </div>
  );
}

function Hero({ plan, pro, label, daysLeft, expiresAt, onBuy }: { plan: PlanInfo; pro: boolean; label: string; daysLeft: number; expiresAt: string | null; onBuy: () => void }) {
  const price = useCountUp(plan.price, 1100);
  const startsAt = pro && expiresAt ? new Date(expiresAt) : new Date();
  const newExpiry = addMonths(startsAt, plan.months);
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
            <br className="hidden sm:block" /> không giới hạn lượt
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-[#fff6dc]/80 expanded:mx-0">
            Lấy đề, xem giải thích AI và nhờ AI giải đề <b className="text-white">không giới hạn và không bị trừ credit</b> trong suốt thời hạn Pro.
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
          </div>

          {/* Mốc thời gian: cho người xem hình dung ngay "mua hôm nay thì dùng đến bao giờ" */}
          <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 expanded:mx-0">
            <div className="flex items-center justify-between text-xs text-[#fff6dc]/70">
              <span>{pro ? "Hết hạn hiện tại" : "Hôm nay"}</span>
              <span className="font-bold text-[#ffc61f]">Pro đến {formatDate(newExpiry.toISOString())}</span>
            </div>
            <div className="relative mt-2 h-2 rounded-full bg-white/15">
              <div className="pro-bar absolute inset-y-0 left-0 w-full rounded-full bg-gradient-to-r from-[#ffd75e] to-[#f0a800]" />
              <span className="absolute -left-1 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-[#1d1500] bg-[#ffd75e]" />
              <Crown size={18} className="absolute -right-1 top-1/2 -translate-y-1/2 fill-[#ffc61f] text-[#ffe58a]" />
            </div>
            <div className="mt-1.5 text-center text-xs text-[#fff6dc]/60">{plan.months} tháng liên tục, không giới hạn lượt</div>
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

// Ba ô "∞": thứ người học quan tâm nhất là không bị đếm lượt
function Unlimited() {
  const items = [
    { icon: Link2, title: "Lấy đề", sub: "không giới hạn" },
    { icon: Sparkles, title: "Giải thích AI", sub: "mọi câu, mọi đề" },
    { icon: Bot, title: "AI giải đề", sub: "không đếm lượt" },
  ];
  return (
    <section className="relative z-10 mx-auto -mt-6 max-w-3xl px-4">
      <Reveal>
        <div className="grid grid-cols-3 overflow-hidden rounded-m3-lg border border-[#ffc61f]/40 bg-surface-container-lowest shadow-m3-2">
          {items.map(({ icon: Icon, title, sub }, i) => (
            <div key={title} className={`flex flex-col items-center gap-1 px-2 py-4 text-center ${i > 0 ? "border-l border-outline-variant" : ""}`}>
              <InfinityIcon size={30} strokeWidth={2.6} className="text-primary" />
              <span className="md-label-large flex items-center gap-1 text-on-surface">
                <Icon size={14} className="text-primary" /> {title}
              </span>
              <span className="md-body-small text-on-surface-variant">{sub}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

// So sánh trực quan: hai thanh dài theo giá, thanh Pro ngắn hơn rõ rệt và vàng nổi bật
function Compare({ plan }: { plan: PlanInfo }) {
  const ratio = plan.fuoPrice > 0 ? plan.price / plan.fuoPrice : 1;
  return (
    <section className="mx-auto max-w-3xl px-4 pt-14">
      <Reveal>
        <h2 className="md-headline-small text-center text-on-surface">
          Cùng {plan.months} tháng, bạn giữ lại <span className="text-primary">{vnd(plan.savings)}</span>
        </h2>
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
            <BadgeCheck size={17} /> Rẻ hơn {plan.savingsPercent}%, mà còn thêm nhiều thứ ngoài kho đề
          </p>
        </div>
      </Reveal>
    </section>
  );
}

// Bảng "chỉ có ở FEPass": cột FuOverflow VIP chỉ có tính năng xem đề; phần còn lại là tính năng FEPass tự xây
function FeatureTable({ plan }: { plan: PlanInfo }) {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-14">
      <Reveal>
        <h2 className="md-headline-small text-center text-on-surface">Chỉ có ở FEPass Pro</h2>
        <p className="md-body-medium mx-auto mt-1 max-w-md text-center text-on-surface-variant">Không chỉ là kho đề: FEPass biến đề thi thành một buổi học có người kèm.</p>
        <div className="mt-6 overflow-hidden rounded-m3-lg border border-outline-variant bg-surface-container-lowest">
          <div className="grid grid-cols-[1fr_72px_88px] items-center border-b border-outline-variant bg-surface-container px-4 py-3 text-center text-xs font-semibold text-on-surface-variant sm:grid-cols-[1fr_110px_120px]">
            <span className="text-left">Tính năng</span>
            <span>FuOverflow VIP</span>
            <span className="inline-flex items-center justify-center gap-1 text-primary"><Crown size={13} /> FEPass Pro</span>
          </div>
          {FEATURES.map(({ icon: Icon, text, fuo }) => (
            <div key={text} className="grid grid-cols-[1fr_72px_88px] items-center border-b border-outline-variant px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_110px_120px]">
              <span className="md-body-medium flex items-start gap-2.5 pr-2 text-on-surface">
                <Icon size={18} className="mt-0.5 shrink-0 text-primary" /> {text}
              </span>
              <span className="flex justify-center">{fuo ? <Check size={18} className="text-on-surface-variant" /> : <Minus size={18} className="text-outline" aria-label="Không có" />}</span>
              <span className="flex justify-center">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full ${GOLD}`}>
                  <Check size={15} strokeWidth={3} />
                </span>
              </span>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_72px_88px] items-center bg-surface-container px-4 py-3 text-center sm:grid-cols-[1fr_110px_120px]">
            <span className="md-label-large text-left text-on-surface">Giá {plan.months} tháng</span>
            <span className="md-body-medium tabular-nums text-on-surface-variant line-through">{vnd(plan.fuoPrice)}</span>
            <span className="md-title-small tabular-nums text-primary">{vnd(plan.price)}</span>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Benefits({ plan, fetchPrice }: { plan: PlanInfo; fetchPrice: number }) {
  const items = [
    plan.benefits.freeFetch && {
      icon: Link2,
      title: "Lấy đề không giới hạn",
      text: "Dán link FuOverflow là có đề, kèm đáp án AI. Không bị giới hạn số đề mỗi giờ.",
      was: fetchPrice > 0 ? `${vnd(fetchPrice)}/đề` : null,
    },
    plan.benefits.freeExplain && { icon: Sparkles, title: "Giải thích AI mọi câu", text: "Bấm xem lời giải của bất kỳ câu nào, không cần mở khóa từng đề.", was: "trả theo câu" },
    plan.benefits.freePe && { icon: Download, title: "Tải đề PE miễn phí", text: "Tải trọn bộ tài nguyên đề PE (file zip), không giới hạn số lần tải.", was: "trả mỗi lần" },
    plan.benefits.topicReport && { icon: Target, title: "Báo cáo điểm yếu theo chủ đề", text: "Biết chính xác mình yếu chủ đề nào của môn, và luyện đúng phần đó. Gói thường chỉ thấy chủ đề yếu nhất.", was: "1 chủ đề" },
    plan.benefits.unlimitedReview && { icon: NotebookPen, title: "Sổ câu sai không giới hạn", text: "Mọi câu sai đều được lưu và nhắc ôn lại đúng lịch. Gói thường lưu tối đa 50 câu.", was: "50 câu" },
  ].filter(Boolean) as { icon: typeof Link2; title: string; text: string; was: string | null }[];
  return (
    <section className="mx-auto max-w-5xl px-4 pt-14">
      <Reveal>
        <h2 className="md-headline-small text-center text-on-surface">Mọi thứ mở khóa khi bạn lên Pro</h2>
      </Reveal>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ icon: Icon, title, text, was }, i) => (
          <Reveal key={title} delay={i * 100}>
            <div className="h-full rounded-m3-lg border border-outline-variant bg-surface-container-lowest p-5 transition hover:-translate-y-1 hover:shadow-m3-2">
              <div className="flex items-start justify-between gap-2">
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-m3-1 ${GOLD}`}>
                  <Icon size={24} strokeWidth={2.2} />
                </span>
                {was && (
                  <span className="md-label-small rounded-full bg-surface-container px-2.5 py-1 text-on-surface-variant">
                    <s>{was}</s> → <b className="text-primary">0đ</b>
                  </span>
                )}
              </div>
              <h3 className="md-title-medium mt-4 text-on-surface">{title}</h3>
              <p className="md-body-medium mt-1 text-on-surface-variant">{text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// Ba bước từ "chưa có gì" tới "dán link lấy đề": giảm cảm giác phức tạp trước khi mua
function Steps({ plan }: { plan: PlanInfo }) {
  const steps = [
    { n: 1, title: "Đăng nhập, xác minh email", text: "Mất chưa tới một phút." },
    { n: 2, title: `Trả ${vnd(plan.price)} bằng credit`, text: "Thiếu thì nạp thêm, xong quay lại ngay." },
    { n: 3, title: "Dán link và học", text: `Lấy đề, xem giải thích, không bị trừ credit suốt ${plan.months} tháng.` },
  ];
  return (
    <section className="mx-auto max-w-4xl px-4 pt-14">
      <Reveal>
        <h2 className="md-headline-small text-center text-on-surface">Bắt đầu chỉ với 3 bước</h2>
        <ol className="mt-6 grid gap-3 sm:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="rounded-m3-md border border-outline-variant bg-surface-container-low p-4">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold ${GOLD}`}>{s.n}</span>
              <div className="md-title-small mt-3 text-on-surface">{s.title}</div>
              <p className="md-body-small mt-1 text-on-surface-variant">{s.text}</p>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}

function Faq() {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-14">
      <Reveal>
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
      </Reveal>
    </section>
  );
}

function FinalCta({ plan, label, onBuy }: { plan: PlanInfo; label: string; onBuy: () => void }) {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-14">
      <Reveal>
        <div className="relative overflow-hidden rounded-m3-xl bg-[radial-gradient(ellipse_at_top,#5a4100_0%,#1d1500_100%)] px-6 py-10 text-center text-[#fff6dc]">
          <div aria-hidden className="pro-glow absolute -top-16 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-[#ffc61f]/30 blur-3xl" />
          <img src={logos.mark} alt="" className="pro-float relative mx-auto h-20 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" draggable={false} />
          <h2 className="relative mt-3 text-2xl font-extrabold">Sẵn sàng học không giới hạn?</h2>
          <p className="relative mt-1.5 text-sm text-[#fff6dc]/75">
            {vnd(plan.price)} cho {plan.months} tháng, tiết kiệm {vnd(plan.savings)} so với FuOverflow VIP.
          </p>
          <button onClick={onBuy} className={`pro-cta md-label-large relative mt-5 inline-flex h-12 items-center gap-2 rounded-full px-8 font-extrabold shadow-[0_10px_36px_-6px_rgba(255,198,31,0.55)] ${GOLD}`}>
            <Crown size={18} /> {label}
          </button>
        </div>
      </Reveal>
    </section>
  );
}
