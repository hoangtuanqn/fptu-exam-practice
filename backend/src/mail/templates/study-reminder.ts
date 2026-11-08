import { button, esc, note, p, renderLayout, signature } from "../layout";

export interface ReminderEmailInput {
  name: string;
  due: number; // số câu đến hạn ôn
  daysToExam: number | null; // null = không đặt ngày thi (hoặc còn xa)
  reviewLink: string;
  unsubscribeLink: string;
}

export function renderReminderEmail({ name, due, daysToExam, reviewLink, unsubscribeLink }: ReminderEmailInput) {
  const countdown = daysToExam === null ? "" : daysToExam === 0 ? "Hôm nay là ngày thi của bạn. " : `Còn ${daysToExam} ngày nữa là đến ngày thi của bạn. `;
  const headline = `${countdown}Hôm nay có ${due} câu cần ôn.`;

  const bodyHtml = [
    p(`<strong>Xin chào ${esc(name)},</strong>`),
    p(esc(headline)),
    p("Ôn vài phút mỗi ngày giúp nhớ lâu hơn nhiều so với ôn dồn. Bấm nút bên dưới để vào ôn ngay."),
    button("Ôn ngay", reviewLink),
    note(`Bạn nhận thư này vì đã bật nhắc ôn qua email, tối đa 1 thư mỗi ngày và chỉ khi hôm nay bạn chưa học. <a href="${esc(unsubscribeLink)}" style="color:inherit">Hủy nhận thư nhắc ôn</a>.`),
    signature(),
  ].join("");

  return {
    html: renderLayout({ title: "Nhắc ôn hôm nay", preheader: headline, bodyHtml }),
    text: [`Xin chào ${name},`, "", headline, "", `Vào ôn: ${reviewLink}`, "", `Hủy nhận thư nhắc ôn: ${unsubscribeLink}`].join("\n"),
  };
}
