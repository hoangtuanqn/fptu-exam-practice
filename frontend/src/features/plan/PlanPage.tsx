import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Crown } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { examImportApi } from "@/features/exam-import/exam-import.api";
import { VerifyEmailNotice } from "@/features/verify-email/VerifyEmailNotice";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { Footer } from "@/shared/layout/Footer";
import { SiteHeader } from "@/shared/layout/SiteHeader";
import { ErrorBox, Loading } from "@/shared/ui/Feedback";
import { addMonths, isPro, proDaysLeft } from "@/shared/utils/pro";
import { ActivateTicketDialog } from "./ActivateTicketDialog";
import { planApi, type ProTicket } from "./plan.api";
import { ProBenefits } from "./pro/ProBenefits";
import { ProCompare } from "./pro/ProCompare";
import { ProFaq } from "./pro/ProFaq";
import { ProFinalCta } from "./pro/ProFinalCta";
import { GOLD_BUTTON } from "@/shared/ui/gold";
import { ProHero } from "./pro/ProHero";
import { ProPlans } from "./pro/ProPlans";
import { ProSteps } from "./pro/ProSteps";
import { ProTickets } from "./pro/ProTickets";
import { vnd } from "./pro/money";
import { UpgradeDialog } from "./UpgradeDialog";

// Trang bán gói Pro (công khai). Bố cục: tiêu đề -> hai gói cạnh nhau -> quyền lợi -> so với VIP -> 3 bước -> hỏi đáp.
// Một hành động chính (mua Pro), gói Nước rút là lựa chọn ngắn hạn; thanh mua nổi hiện khi hai gói đã cuộn khỏi màn hình.
export default function PlanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const info = useApi(() => planApi.info(), []);
  const fetchPrice = useApi(() => examImportApi.price(), []).data?.price ?? 0;
  const [open, setOpen] = useState<false | "pro" | "sprint">(false);
  const [openLater, setOpenLater] = useState(false); // mở hộp mua ở chế độ "giữ vé, dùng sau"
  const tickets = useApi(() => (user ? planApi.tickets() : Promise.resolve([] as ProTicket[])), [user?.id]);
  const [activating, setActivating] = useState<ProTicket | null>(null);
  const [params, setParams] = useSearchParams();
  const [plansVisible, setPlansVisible] = useState(true);
  const plansRef = useRef<HTMLDivElement>(null);

  const pro = isPro(user);
  const unverified = !!user && !user.emailVerifiedAt;
  const plan = info.data;
  // Chữ nút theo ngữ cảnh: khách được báo trước sẽ phải đăng nhập (đỡ bất ngờ), người đang là Pro thấy "Gia hạn"
  const label = !user ? "Đăng nhập để nâng cấp Pro" : pro ? "Gia hạn Pro" : "Nâng cấp Pro ngay";

  useEffect(() => {
    const el = plansRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setPlansVisible(!!e?.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, [plan]);

  const cta = (kind: "pro" | "sprint" = "pro") => {
    if (!user) return navigate("/login", { state: { from: "/pro" } });
    if (unverified) {
      toast.error("Hãy xác minh email trước khi nâng cấp Pro. Mình đã đưa bạn tới mục xác minh bên dưới.");
      return document.getElementById("pro-verify")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setOpen(kind);
  };

  // Liên kết từ lời mời ở trang chủ (/pro?buy=sprint&later=1): mở thẳng hộp mua một lần rồi bỏ tham số để tải lại không mở lại
  const buy = params.get("buy");
  useEffect(() => {
    if (!plan || !user || (buy !== "pro" && buy !== "sprint")) return;
    setParams({}, { replace: true });
    setOpenLater(params.get("later") === "1");
    cta(buy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, user, buy]);

  const startsAt = pro && user?.proExpiresAt ? new Date(user.proExpiresAt) : new Date();

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
            <ProHero plan={plan} pro={pro} daysLeft={proDaysLeft(user)} expiresAt={user?.proExpiresAt ?? null} />
            {unverified && (
              <div id="pro-verify" className="relative z-10 mx-auto -mt-16 max-w-3xl px-4 pb-4">
                <VerifyEmailNotice variant="inline" message="Bạn cần xác minh email trước khi nâng cấp Pro." />
              </div>
            )}
            <ProTickets tickets={tickets.data ?? []} onActivate={setActivating} />
            <div ref={plansRef}>
              <ProPlans plan={plan} label={label} newExpiry={addMonths(startsAt, plan.months)} onBuy={cta} />
            </div>
            <ProBenefits plan={plan} fetchPrice={fetchPrice} />
            <ProCompare plan={plan} />
            <ProSteps plan={plan} />
            <ProFaq />
            <ProFinalCta plan={plan} label={label} onBuy={() => cta()} />
          </>
        )}
      </main>

      {/* Chân trang: nền liền với footer nên phần đệm cho thanh mua nổi (mobile) không lộ thành một dải trống bên dưới */}
      <div className="bg-surface-container-low pb-[84px] expanded:pb-0">
        <Footer />
      </div>

      {plan && !plansVisible && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-3 expanded:bottom-5 expanded:left-1/2 expanded:right-auto expanded:w-[32rem] expanded:-translate-x-1/2 expanded:px-0 expanded:pb-0">
          <div className="pro-rise flex items-center gap-3 rounded-full border border-[#ffc61f]/40 bg-[#1d1500]/95 py-2 pl-5 pr-2 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)] backdrop-blur">
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-xs text-[#fff6dc]/70">
                <span className="line-through">{vnd(plan.fuoPrice)}</span> · tiết kiệm {vnd(plan.savings)}
              </div>
              <div className="text-lg font-extrabold tabular-nums text-[#ffc61f]">
                {vnd(plan.price)} <span className="text-xs font-semibold text-[#fff6dc]/70">/ {plan.months} tháng</span>
              </div>
            </div>
            <button onClick={() => cta()} className={`pro-cta md-label-large inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-5 font-extrabold ${GOLD_BUTTON}`}>
              <Crown size={17} /> {pro ? "Gia hạn" : user ? "Nâng cấp" : "Đăng nhập"}
            </button>
          </div>
        </div>
      )}

      {open && plan && (
        <UpgradeDialog
          plan={plan}
          kind={open}
          defaultLater={openLater}
          onClose={() => {
            setOpen(false);
            setOpenLater(false);
            tickets.reload();
          }}
        />
      )}
      {activating && (
        <ActivateTicketDialog
          ticket={activating}
          onClose={() => {
            setActivating(null);
            tickets.reload();
          }}
        />
      )}
    </div>
  );
}
