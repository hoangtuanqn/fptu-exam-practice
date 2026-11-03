import { MAIL_BRAND, type MailBanner } from "../constants/mail";

// Khung chung của mọi email, ưu tiên điện thoại: một cột, lề vừa phải, banner không có chữ (thu nhỏ vẫn rõ),
// tiêu đề là chữ HTML, chi tiết giao dịch xếp "nhãn trên, giá trị dưới", nút rộng hết bề ngang.
// Dựa trên bố cục bảng 600px của FStyle_BTC.html. Chỉ dùng CSS nội tuyến + bảng để chạy được trên Gmail/Outlook/Apple Mail.

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const { company, product, tagline, founder, facebookUrl, blue, navy } = MAIL_BRAND;
const FONT = "Inter, Roboto, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const TABLE = "mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;";
const INK = "#101828"; // chữ chính
const MUTED = "#667085"; // chữ phụ
const LINE = "#e4e9f1"; // đường kẻ mảnh

const TEXT = `margin:0 0 16px 0;font-family:${FONT};font-size:16px;line-height:26px;color:#344054;`;

// ---- Các khối dùng trong thân thư

export const p = (html: string) => `<p style="${TEXT}">${html}</p>`;

export const heading = (text: string) =>
  `<p style="margin:20px 0 8px 0;font-family:${FONT};font-size:15px;line-height:22px;font-weight:700;color:${INK}">${esc(text)}</p>`;

export const list = (items: string[]) =>
  `<ul style="${TEXT}margin-left:18px;padding-left:4px">${items.map((i) => `<li style="margin-bottom:8px">${i}</li>`).join("")}</ul>`;

// Nút rộng hết bề ngang: dễ bấm trên điện thoại, vẫn gọn trên máy tính
export const button = (label: string, href: string) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="${TABLE}margin:8px 0 20px 0">
    <tr>
      <td align="center" bgcolor="${blue}" style="border-radius:10px;background-color:${blue}">
        <a class="btn" href="${esc(href)}" target="_blank" style="display:block;padding:15px 20px;font-family:${FONT};font-size:16px;font-weight:700;line-height:20px;color:#ffffff;text-decoration:none;border-radius:10px">${esc(label)}</a>
      </td>
    </tr>
  </table>`;

// Chi tiết giao dịch: mỗi mục là nhãn nhỏ viết hoa phía trên, giá trị phía dưới. Giá trị dài (mã, email) tự xuống dòng
// nên không bị bóp hẹp như bảng hai cột trên màn hình nhỏ. Mục `strong` được nhấn bằng màu xanh và cỡ chữ lớn.
export const details = (rows: { label: string; value: string; strong?: boolean }[]) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="${TABLE}margin:4px 0 20px 0;border:1px solid ${LINE};border-radius:12px;background-color:#f7f9fc">
    ${rows
      .map(
        (r, i) => `<tr><td style="padding:13px 18px;${i ? `border-top:1px solid ${LINE};` : ""}">
      <div style="font-family:${FONT};font-size:11px;line-height:16px;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED}">${esc(r.label)}</div>
      <div style="margin-top:3px;font-family:${FONT};font-size:${r.strong ? 22 : 16}px;line-height:${r.strong ? 30 : 24}px;font-weight:${r.strong ? 700 : 600};color:${r.strong ? blue : INK};word-break:break-word">${r.value}</div>
    </td></tr>`,
      )
      .join("")}
  </table>`;

// Ghi chú nhỏ màu xám
export const note = (html: string) =>
  `<p style="margin:0 0 10px 0;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED}">${html}</p>`;

// Mã QR chuyển khoản (ảnh do SePay dựng sẵn, tải từ qr.sepay.vn)
export const qrImage = (src: string) =>
  `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="${TABLE}margin:0 0 20px 0"><tr><td align="center"><img src="${esc(src)}" width="220" height="220" alt="Mã QR chuyển khoản" style="display:block;border:1px solid ${LINE};border-radius:12px;max-width:100%;height:auto" /></td></tr></table>`;

export const supportLine = () =>
  note(`Cần hỗ trợ? Nhắn cho chúng mình qua fanpage <a href="${esc(facebookUrl)}" target="_blank" style="color:${blue};font-weight:700">${esc(company)}</a>.`);

export const signature = () =>
  `<p style="margin:22px 0 0 0;padding-top:18px;border-top:1px solid ${LINE};font-family:${FONT};font-size:14px;line-height:22px;color:${MUTED}">Trân trọng,<br /><strong style="color:${INK}">${esc(company)}</strong></p>`;

interface LayoutInput {
  eyebrow: string; // nhãn nhỏ viết hoa phía trên tiêu đề, ví dụ "THANH TOÁN"
  title: string;
  preheader: string; // dòng xem trước trong hộp thư
  banner: MailBanner;
  bodyHtml: string;
}

export function renderLayout({ eyebrow, title, preheader, banner, bodyHtml }: LayoutInput) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta content="width=device-width, initial-scale=1" name="viewport" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta content="telephone=no" name="format-detection" />
    <title>${esc(title)} - ${esc(product)}</title>
    <!--[if gte mso 9]>
      <noscript><xml><o:OfficeDocumentSettings><o:AllowPNG></o:AllowPNG><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
    <![endif]-->
    <!--[if !mso]><!---->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
    <!--<![endif]-->
    <style type="text/css">
      body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      img { -ms-interpolation-mode: bicubic; }
      a { text-decoration: none; }
      @media only screen and (max-width: 620px) {
        .outer { padding: 0 !important; }
        .card { border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; }
        .px { padding-left: 20px !important; padding-right: 20px !important; }
        .h1 { font-size: 22px !important; line-height: 30px !important; }
      }
    </style>
  </head>
  <body style="width:100%;height:100%;padding:0;margin:0;background-color:#eef1f6">
    <div dir="ltr" lang="vi" style="background-color:#eef1f6">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#eef1f6">${esc(preheader)}</div>
      <table width="100%" cellspacing="0" cellpadding="0" role="none" style="${TABLE}width:100%;background-color:#eef1f6">
        <tr>
          <td class="outer" valign="top" align="center" style="padding:28px 12px;margin:0">
            <table class="card" width="600" cellpadding="0" cellspacing="0" bgcolor="#ffffff" align="center" role="none" style="${TABLE}background-color:#ffffff;width:100%;max-width:600px;border:1px solid ${LINE};border-radius:16px;overflow:hidden">
              <tr>
                <td align="center" style="padding:0;font-size:0;line-height:0">
                  <img width="600" src="cid:${banner.cid}" alt="${esc(banner.alt)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none" />
                </td>
              </tr>
              <tr>
                <td class="px" align="left" style="padding:30px 32px 0 32px">
                  <p style="margin:0 0 8px 0;font-family:${FONT};font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.14em;color:${blue}">${esc(eyebrow)}</p>
                  <h1 class="h1" style="margin:0 0 20px 0;font-family:${FONT};font-size:26px;line-height:34px;font-weight:700;color:${navy}">${esc(title)}</h1>
                </td>
              </tr>
              <tr>
                <td class="px" align="left" style="padding:0 32px 30px 32px">${bodyHtml}</td>
              </tr>
              <tr>
                <td class="px" align="left" style="padding:20px 32px 24px 32px;background-color:#f7f9fc;border-top:1px solid ${LINE}">
                  <p style="margin:0;font-family:${FONT};font-size:14px;line-height:22px;color:${INK}"><strong style="color:${blue}">${esc(company)}</strong> <span style="color:${MUTED}">· ${esc(tagline)}</span></p>
                  <p style="margin:2px 0 0 0;font-family:${FONT};font-size:13px;line-height:21px;color:${MUTED}">Founder: ${esc(founder)} · <a href="${esc(facebookUrl)}" target="_blank" style="color:${MUTED};text-decoration:underline">${esc(facebookUrl.replace(/^https?:\/\//, ""))}</a></p>
                  <p style="margin:10px 0 0 0;font-family:${FONT};font-size:12px;line-height:18px;color:#98a2b3">Email tự động từ hệ thống ${esc(product)}. Vui lòng không trả lời trực tiếp thư này.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>`;
}
