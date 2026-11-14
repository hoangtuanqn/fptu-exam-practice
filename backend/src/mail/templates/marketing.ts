import { MAIL_BRAND } from "../../constants/mail";
import { PRO_BENEFITS } from "../../constants/plan";
import { formatCredit, formatDateTimeVN, formatMoney } from "../../utils/format";
import { button, details, esc, list, note, p, renderLayout, signature } from "../layout";

// Thư marketing tự động (win-back, mời Pro, nhắc hết hạn Pro). Chỉ dùng số liệu thật của người nhận, không khan hiếm giả, không đếm ngược.

export interface MarketingMail {
  subject: string;
  html: string;
  text: string;
}

interface Base {
  name: string;
  unsubscribeUrl: string; // trang hủy nhận thư trên web
}

const { company, product } = MAIL_BRAND;

const footer = (why: string, unsubscribeUrl: string) =>
  note(`${esc(why)} Không muốn nhận những thư như thế này nữa? <a href="${esc(unsubscribeUrl)}" style="color:inherit">Hủy nhận thư</a>.`);

const build = (o: { subject: string; title: string; preheader: string; blocks: string[]; textLines: string[]; why: string; unsubscribeUrl: string; name: string }): MarketingMail => ({
  subject: o.subject,
  html: renderLayout({ title: o.title, preheader: o.preheader, bodyHtml: [p(`<strong>Xin chào ${esc(o.name)},</strong>`), ...o.blocks, footer(o.why, o.unsubscribeUrl), signature()].join("") }),
  text: [`Xin chào ${o.name},`, "", ...o.textLines, "", `${o.why} Hủy nhận thư: ${o.unsubscribeUrl}`, "", "Trân trọng,", company].join("\n"),
});

const WHY_ACCOUNT = `Bạn nhận thư này vì có tài khoản trên ${product}.`;

// ---------- Win-back bước 1 (vắng 14 ngày): số câu còn cần ôn, môn đang học

export interface Winback1Input extends Base {
  due: number;
  subject: string | null; // tên (hoặc mã) môn của lần làm bài gần nhất
  url: string;
}

export function renderWinback1(i: Winback1Input): MarketingMail {
  const lead = i.due > 0 ? `Bạn còn ${i.due} câu đã làm sai đang chờ ôn lại.` : i.subject ? `Lần trước bạn đang luyện môn ${i.subject}.` : "Đã hai tuần bạn chưa quay lại luyện đề.";
  const more = i.due > 0 && i.subject ? `Lần gần nhất bạn luyện môn ${i.subject}. ` : "";
  return build({
    ...i,
    subject: i.due > 0 ? `Còn ${i.due} câu đang chờ bạn ôn lại` : "Quay lại luyện tiếp nhé",
    title: "Lâu rồi không gặp",
    preheader: lead,
    blocks: [p(esc(lead)), p(esc(`${more}Ôn lại vài phút lúc này giúp bạn nhớ lâu hơn ôn dồn sát ngày thi.`)), button(i.due > 0 ? "Ôn lại ngay" : "Luyện tiếp", i.url)],
    textLines: [lead, `${more}Ôn lại vài phút lúc này giúp bạn nhớ lâu hơn ôn dồn sát ngày thi.`, "", `Vào ôn: ${i.url}`],
    why: WHY_ACCOUNT,
  });
}

// ---------- Win-back bước 2 (vắng 30 ngày): đề mới của môn, credit tặng sắp hết hạn (chỉ khi có thật)

export interface Winback2Input extends Base {
  subject: string | null;
  newExams: number;
  expiringCredit: { amount: number; expiresAt: Date } | null;
  url: string;
}

export function renderWinback2(i: Winback2Input): MarketingMail {
  const lines: string[] = [];
  if (i.subject && i.newExams > 0) lines.push(`Môn ${i.subject} vừa có thêm ${i.newExams} đề mới đã có đáp án.`);
  if (i.expiringCredit) lines.push(`Bạn còn ${formatCredit(i.expiringCredit.amount)} được tặng sẽ hết hạn lúc ${formatDateTimeVN(i.expiringCredit.expiresAt)}. Dùng trước khi hết hạn để không bị mất.`);
  if (lines.length === 0) lines.push("Kho đề vẫn được cập nhật thường xuyên, kèm đáp án và giải thích từng câu.");
  return build({
    ...i,
    subject: i.subject && i.newExams > 0 ? `Môn ${i.subject} có ${i.newExams} đề mới` : i.expiringCredit ? `Credit của bạn sắp hết hạn` : "Có gì mới trong kho đề",
    title: "Có gì mới cho bạn",
    preheader: lines[0] ?? "",
    blocks: [...lines.map((l) => p(esc(l))), button("Xem ngay", i.url)],
    textLines: [...lines, "", `Xem ngay: ${i.url}`],
    why: WHY_ACCOUNT,
  });
}

// ---------- Win-back bước 3 (vắng 60 ngày): thư cuối

export interface Winback3Input extends Base {
  url: string;
}

export function renderWinback3(i: Winback3Input): MarketingMail {
  const lead = "Đã lâu bạn chưa quay lại. Nếu bạn đã thi xong thì chúc mừng bạn! Đây là thư cuối chúng mình gửi về chuyện này.";
  return build({
    ...i,
    subject: "Có phải bạn đã thi xong?",
    title: "Có phải bạn đã thi xong?",
    preheader: lead,
    blocks: [p(esc(lead)), p("Còn môn cần ôn thì kho đề và các câu bạn đã làm sai vẫn ở đây. Thi xong rồi thì bấm nút thứ hai, chúng mình sẽ không gửi những thư như thế này nữa."), button("Mình vẫn đang ôn", i.url), button("Mình thi xong rồi, dừng gửi thư", i.unsubscribeUrl)],
    textLines: [lead, "", `Vẫn đang ôn: ${i.url}`, `Thi xong rồi, dừng gửi thư: ${i.unsubscribeUrl}`],
    why: WHY_ACCOUNT,
  });
}

// ---------- Mời Pro: tiền đã trả lẻ thật so với giá gói thật

export interface UpsellInput extends Base {
  spent: number; // credit đã trả lẻ trong `spentDays` ngày (đã trừ hoàn)
  spentDays: number;
  daysToExam: number | null;
  pro: { name: string; months: number; price: number; perDay: number; fuoPrice: number; savingsPercent: number };
  sprint: { name: string; days: number; price: number };
  url: string;
}

export function renderUpsell(i: UpsellInput): MarketingMail {
  const lines: string[] = [];
  if (i.daysToExam !== null) lines.push(i.daysToExam === 0 ? "Hôm nay là buổi thi gần nhất của bạn." : `Còn ${i.daysToExam} ngày đến buổi thi gần nhất của bạn.`);
  if (i.spent > 0) lines.push(`${i.spentDays} ngày qua bạn đã trả lẻ ${formatCredit(i.spent)} cho lấy đề, giải thích AI và tải đề PE.`);
  const offer = `Gói ${i.pro.name} ${i.pro.months} tháng giá ${formatCredit(i.pro.price)} (khoảng ${formatCredit(i.pro.perDay)} mỗi ngày). Trong thời hạn gói, những việc này không mất thêm credit.`;
  const fuo = i.pro.savingsPercent > 0 ? `Rẻ hơn ${i.pro.savingsPercent}% so với mua VIP FuOverflow cùng thời hạn (${formatMoney(i.pro.fuoPrice)}).` : "";
  const sprint = `Chỉ cần ôn gấp trước kỳ thi? Gói ${i.sprint.name} ${i.sprint.days} ngày giá ${formatCredit(i.sprint.price)}.`;
  const rows = [
    ...(i.spent > 0 ? [{ label: `Bạn đã trả lẻ (${i.spentDays} ngày)`, value: esc(formatCredit(i.spent)) }] : []),
    { label: `Gói ${i.pro.name} ${i.pro.months} tháng`, value: esc(formatCredit(i.pro.price)), strong: true },
    { label: `Gói ${i.sprint.name} ${i.sprint.days} ngày`, value: esc(formatCredit(i.sprint.price)) },
  ];
  return build({
    ...i,
    subject: i.spent > 0 ? `Bạn đã trả lẻ ${formatCredit(i.spent)} trong ${i.spentDays} ngày qua` : `Ôn thi không lo hết credit với gói ${i.pro.name}`,
    title: `Gói ${i.pro.name} có hợp với bạn?`,
    preheader: lines[0] ?? offer,
    blocks: [...lines.map((l) => p(esc(l))), p(esc(offer)), details(rows), ...(fuo ? [p(esc(fuo))] : []), p(esc(sprint)), button("Xem các gói", i.url)],
    textLines: [...lines, offer, ...(fuo ? [fuo] : []), sprint, "", `Xem các gói: ${i.url}`],
    why: WHY_ACCOUNT,
  });
}

// ---------- Gửi thủ công: văn bản thường do admin soạn (luôn escape, không nhận HTML), một nút tới đường dẫn nội bộ

export interface BroadcastInput extends Base {
  subject: string;
  body: string; // đoạn cách nhau bằng dòng trống
  ctaLabel: string;
  url: string;
}

const PREHEADER_CHARS = 140;

export const broadcastParagraphs = (body: string) =>
  body
    .split(/\r?\n[ \t]*\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

export function renderBroadcast(i: BroadcastInput): MarketingMail {
  const paras = broadcastParagraphs(i.body);
  return build({
    ...i,
    title: i.subject,
    preheader: (paras[0] ?? "").replace(/\s+/g, " ").slice(0, PREHEADER_CHARS),
    blocks: [...paras.map((t) => p(esc(t).replace(/\r?\n/g, "<br />"))), button(i.ctaLabel, i.url)],
    textLines: [...paras.flatMap((t, n) => (n ? ["", t] : [t])), "", `${i.ctaLabel}: ${i.url}`],
    why: WHY_ACCOUNT,
  });
}

// ---------- Pro sắp hết hạn

// Quyền lợi đang bật trong PRO_BENEFITS, viết cho người dùng
const BENEFIT_LABELS: Record<keyof typeof PRO_BENEFITS, string> = {
  freeFetch: "Lấy đề FuOverflow không mất credit",
  freeExplain: "Xem giải thích AI mọi câu không mất credit",
  freePe: "Tải bộ tài nguyên đề PE không mất credit",
  topicReport: "Báo cáo điểm mạnh, điểm yếu đầy đủ theo chủ đề",
  frequentQuestions: "Xem toàn bộ Câu hay ra của môn",
  unlimitedReview: "Sổ câu sai không giới hạn số câu",
};
export const proBenefitLines = () => (Object.keys(PRO_BENEFITS) as (keyof typeof PRO_BENEFITS)[]).filter((k) => PRO_BENEFITS[k]).map((k) => BENEFIT_LABELS[k]);

export interface ExpiryInput extends Base {
  expiresAt: Date;
  daysLeft: number;
  url: string;
}

export function renderExpiry(i: ExpiryInput): MarketingMail {
  const lead = i.daysLeft <= 1 ? `Gói Pro của bạn hết hạn lúc ${formatDateTimeVN(i.expiresAt)}.` : `Gói Pro của bạn còn ${i.daysLeft} ngày, hết hạn lúc ${formatDateTimeVN(i.expiresAt)}.`;
  const benefits = proBenefitLines();
  const renew = "Gia hạn trước khi hết hạn không mất ngày nào: thời hạn mới được cộng nối tiếp từ ngày hết hạn cũ.";
  return build({
    ...i,
    subject: i.daysLeft <= 1 ? `Gói Pro của bạn hết hạn lúc ${formatDateTimeVN(i.expiresAt)}` : `Gói Pro của bạn còn ${i.daysLeft} ngày`,
    title: "Pro sắp hết hạn",
    preheader: lead,
    blocks: [p(esc(lead)), p("Hết hạn thì bạn vẫn dùng bình thường, chỉ không còn các quyền lợi sau:"), list(benefits.map(esc)), p(esc(renew)), button("Gia hạn Pro", i.url)],
    textLines: [lead, "", "Hết hạn thì bạn không còn:", ...benefits.map((b) => `- ${b}`), "", renew, "", `Gia hạn: ${i.url}`],
    why: "Bạn nhận thư này vì đang dùng gói Pro.",
  });
}
