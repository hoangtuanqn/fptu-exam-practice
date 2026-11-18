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
  const headline = `${countdown}Hôm nay bạn có ${due} câu cần ôn.`;

  const bodyHtml = [
    p(`Kính gửi <strong>${esc(name)}</strong>,`),
    p(esc(headline)),
    p("Ôn tập ngắn mỗi ngày giúp ghi nhớ lâu hơn so với ôn dồn. Nhấn nút bên dưới để bắt đầu."),
    button("Ôn tập ngay", reviewLink),
    note(`Bạn nhận email này vì đã bật nhắc ôn qua email. Chúng tôi gửi tối đa 1 email mỗi ngày và chỉ khi hôm nay bạn chưa học. Nếu không muốn nhận nữa, bạn có thể <a href="${esc(unsubscribeLink)}" style="color:inherit">hủy nhận email nhắc ôn</a> bất cứ lúc nào.`),
    signature(),
  ].join("");

  return {
    html: renderLayout({ title: "Nhắc ôn tập hôm nay", preheader: headline, bodyHtml }),
    text: [`Kính gửi ${name},`, "", headline, "", `Bắt đầu ôn tập: ${reviewLink}`, "", `Hủy nhận email nhắc ôn: ${unsubscribeLink}`].join("\n"),
  };
}
