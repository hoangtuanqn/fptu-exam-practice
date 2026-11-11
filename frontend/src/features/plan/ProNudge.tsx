import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock, Ticket, Wallet, X, type LucideIcon } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useApi } from "@/shared/hooks/useApi";
import { useUpsell } from "@/shared/hooks/useUpsell";
import { formatDate } from "@/shared/utils/formatters";
import { isPro, proDaysLeft } from "@/shared/utils/pro";
import { isSnoozed, snooze, trackShownOncePerSession } from "@/shared/utils/promptSnooze";
import { trackPrompt, type PromptSurface } from "@/shared/utils/trackPrompt";
import { ActivateTicketDialog } from "./ActivateTicketDialog";
import { planApi, type PlanInfo, type PlanSignals, type ProTicket } from "./plan.api";
import { vnd } from "./pro/money";
import { ProTeaser } from "./ProTeaser";

const DAY_MS = 86_400_000;
const EXPIRY_WARN_DAYS = 14; // vé còn ngần này ngày hạn thì báo "sắp hết hạn"
const NEWCOMER_MS = DAY_MS; // tài khoản mới tạo trong ngần này thời gian thì chưa mời mua (đang ở danh sách "Bắt đầu", chưa thử gì)

type Choice = { surface: Extract<PromptSurface, "ticket-ready" | "exam-countdown" | "spend-vs-pro">; tickets?: ProTicket[]; exam?: NonNullable<PlanSignals["exam"]>; spent?: PlanSignals["spent"] };

// Chọn đúng MỘT lời mời, ưu tiên cái gần với việc người dùng sắp làm nhất: vé đã mua chưa dùng > kỳ thi sắp tới > tiền đã chi lẻ.
// Mỗi lời mời chỉ dựa trên dữ kiện thật của chính người dùng; không có dữ kiện thì không chọn gì.
function choose({ pro, daysLeft, newcomer, tickets, signals }: { pro: boolean; daysLeft: number; newcomer: boolean; tickets: ProTicket[]; signals: PlanSignals | null }): Choice | null {
  if (tickets.length > 0 && (!pro || daysLeft <= 7)) return { surface: "ticket-ready", tickets };
  if (pro || newcomer || !signals) return null; // người mới chưa thử gì thì chưa chào bán
  if (signals.exam) return { surface: "exam-countdown", exam: signals.exam };
  if (signals.spent.total >= signals.spent.minToShow) return { surface: "spend-vs-pro", spent: signals.spent };
  return null;
}

const dm = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

function content(choice: Choice, plan: PlanInfo): { icon: LucideIcon; title: ReactNode; text: ReactNode; cta: string; to?: string } {
  if (choice.surface === "ticket-ready") {
    const list = choice.tickets ?? [];
    const first = list[0]!;
    const left = Math.ceil((new Date(first.expiresAt).getTime() - Date.now()) / DAY_MS);
    return {
      icon: Ticket,
      title: list.length === 1 ? `Bạn có 1 vé ${first.name} chưa kích hoạt` : `Bạn có ${list.length} vé Pro chưa kích hoạt`,
      text: left <= EXPIRY_WARN_DAYS ? `Còn ${Math.max(left, 0)} ngày để kích hoạt vé (trước ngày ${formatDate(first.expiresAt)}), quá hạn là mất vé.` : `Hãy kích hoạt vé trước ngày ${formatDate(first.expiresAt)}. Bấm kích hoạt khi bạn bắt đầu ôn.`,
      cta: "Kích hoạt",
    };
  }
  if (choice.surface === "exam-countdown") {
    const e = choice.exam!;
    const subject = e.subjectCode ? `Môn ${e.subjectCode}` : "Kỳ thi của bạn";
    const when = e.daysLeft <= 0 ? "thi hôm nay" : e.daysLeft === 1 ? "thi ngày mai" : `thi sau ${e.daysLeft} ngày`;
    const { days, price, name } = plan.sprint;
    if (e.daysLeft <= days) {
      return { icon: CalendarClock, title: `${subject} ${when} (${formatDate(e.date)})`, text: `Gói ${name} ${days} ngày giá ${vnd(price)}: lấy đề, giải thích AI và tải PE không bị trừ thêm cho tới kỳ thi.`, cta: "Mua gói Nước rút", to: "/pro?buy=sprint" };
    }
    const activateOn = new Date(new Date(e.date).getTime() - (days - 1) * DAY_MS);
    return { icon: CalendarClock, title: `${subject} ${when} (${formatDate(e.date)})`, text: `Mua vé ${name} ${vnd(price)} từ bây giờ, bật vào khoảng ${dm(activateOn)} là phủ trọn ${days} ngày trước kỳ thi.`, cta: "Mua vé Nước rút", to: "/pro?buy=sprint&later=1" };
  }
  const s = choice.spent!;
  const covered = [plan.benefits.freeFetch && "lấy đề", plan.benefits.freeExplain && "giải thích AI", plan.benefits.freePe && "tải đề PE"].filter(Boolean).join(", ");
  return {
    icon: Wallet,
    title: `Bạn đã chi ${vnd(s.total)} cho đề và giải thích lẻ trong ${s.days} ngày qua`,
    text: `Pro ${plan.months} tháng chỉ ${vnd(plan.price)}${covered ? `: ${covered} không bị trừ thêm` : ""}.`,
    cta: "Xem gói Pro",
    to: "/pro",
  };
}

// Lời mời Pro ở trang chủ cho thành viên: một dải, có nút "Để sau" (ẩn tối thiểu vài ngày), không có dữ kiện thật thì quay về dải Pro thường.
export function ProNudge() {
  const { user } = useAuth();
  const { flags } = useUpsell();
  const pro = isPro(user);
  const daysLeft = proDaysLeft(user);
  const newcomer = !!user && Date.now() - new Date(user.createdAt).getTime() < NEWCOMER_MS;
  const eligible = !!user && flags.proNudge;
  const plan = useApi(() => (eligible ? planApi.info() : Promise.resolve(null)), [eligible]);
  const tickets = useApi(() => (eligible ? planApi.tickets() : Promise.resolve([] as ProTicket[])), [eligible, user?.id]);
  const signals = useApi(() => (eligible && !pro ? planApi.signals() : Promise.resolve(null)), [eligible, pro, user?.id]);
  const [closed, setClosed] = useState<string | null>(null);
  const [activating, setActivating] = useState<ProTicket | null>(null);

  const choice = useMemo(() => (eligible && !tickets.loading && !signals.loading ? choose({ pro, daysLeft, newcomer, tickets: tickets.data ?? [], signals: signals.data ?? null }) : null), [eligible, pro, daysLeft, newcomer, tickets.loading, tickets.data, signals.loading, signals.data]);
  const visible = !!choice && !!plan.data && closed !== choice.surface && !isSnoozed(choice.surface);

  useEffect(() => {
    if (visible && choice) trackShownOncePerSession(choice.surface);
  }, [visible, choice]);

  // Đang tải dữ kiện thì chưa hiện gì để khỏi nháy từ dải Pro thường sang lời mời
  if (eligible && (tickets.loading || signals.loading || plan.loading)) return null;
  if (!visible || !choice || !plan.data) return <ProTeaser />;

  const c = content(choice, plan.data);
  const Icon = c.icon;
  const click = () => trackPrompt(choice.surface, "click");
  const cta =
    "pro-cta md-label-large inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-b from-[#ffd75e] to-[#f0a800] px-4 font-extrabold text-[#3a2600] transition hover:brightness-105";

  return (
    <>
      <section aria-label="Gợi ý gói Pro" className="relative mx-auto mt-6 max-w-xl rounded-2xl bg-gradient-to-r from-[#2a1d00] to-[#4a3500] py-3 pl-3 pr-9 text-left text-[#fff6dc] shadow-m3-2 ring-1 ring-[#ffc61f]/50">
        <button
          type="button"
          onClick={() => {
            trackPrompt(choice.surface, "dismiss");
            snooze(choice.surface);
            setClosed(choice.surface);
          }}
          aria-label="Để sau"
          className="absolute right-1.5 top-1.5 rounded-full p-1.5 text-[#fff6dc]/60 hover:bg-white/10"
        >
          <X size={15} />
        </button>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#ffd75e] to-[#f0a800] text-[#3a2600]">
            <Icon size={18} strokeWidth={2.4} />
          </span>
          <span className="min-w-[12rem] flex-1 text-sm leading-snug">
            <b className="text-[#ffc61f]">{c.title}</b>
            <span className="mt-0.5 block text-xs text-[#fff6dc]/80">{c.text}</span>
          </span>
          {c.to ? (
            <Link to={c.to} onClick={click} className={cta}>
              {c.cta} <ArrowRight size={15} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                click();
                setActivating(choice.tickets![0]!);
              }}
              className={cta}
            >
              {c.cta} <ArrowRight size={15} />
            </button>
          )}
        </div>
      </section>
      {activating && (
        <ActivateTicketDialog
          ticket={activating}
          onClose={() => {
            setActivating(null);
            tickets.reload();
          }}
        />
      )}
    </>
  );
}
