import { MAIL_BRAND, MAIL_IMAGES } from "../constants/mail";

// Khung chung của mọi email, kiểu thư doanh nghiệp: nền xám nhạt, thẻ trắng 600px viền mảnh với vạch vàng mỏng trên cùng, logo nhỏ ở đầu thư,
// tiêu đề căn trái, nội dung phẳng (không khung viền), khối chữ ký + liên hệ, rồi dòng chân thư nằm ngoài thẻ. Không dùng ảnh bìa.
// Màu vàng của mascot Cóc Pass (vàng #ffc61f, chữ nâu đậm #3f2606). Chỉ dùng CSS nội tuyến + bảng để chạy được trên Gmail/Outlook/Apple Mail.

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const { company, product, founder, facebookUrl, siteUrl, gold, deep, dark } = MAIL_BRAND;
const FONT = "Inter, -apple-system, 'Segoe UI', Arial, sans-serif"; // Inter nếu ứng dụng tải được phông web, không thì phông hệ thống
const TABLE = "mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;";
const INK = "#101828"; // chữ đậm
const BODY = "#333333"; // chữ nội dung
const MUTED = "#6b7280"; // chữ phụ
const LINE = "#e5e7eb"; // đường kẻ mảnh
const PAGE = "#f3f4f6"; // nền ngoài thẻ

const TEXT = `margin:0 0 14px 0;font-family:${FONT};font-size:16px;line-height:25px;color:${BODY};`;

// ---- Các khối dùng trong thân thư

export const p = (html: string) => `<p style="${TEXT}">${html}</p>`;

export const heading = (text: string) =>
  `<p style="margin:18px 0 8px 0;font-family:${FONT};font-size:16px;line-height:24px;font-weight:700;color:${INK}">${esc(text)}</p>`;

export const list = (items: string[]) =>
  `<ul style="${TEXT}margin-left:20px;padding-left:4px">${items.map((i) => `<li style="margin-bottom:8px">${i}</li>`).join("")}</ul>`;

// Nút gọn, căn trái; trên điện thoại giãn hết bề ngang cho dễ bấm (class .btn-wrap trong khối style của khung)
export const button = (label: string, href: string) => `
  <table class="btn-wrap" cellpadding="0" cellspacing="0" role="presentation" style="${TABLE}margin:8px 0 20px 0">
    <tr>
      <td align="center" bgcolor="${gold}" style="border-radius:6px;background-color:${gold}">
        <a class="btn" href="${esc(href)}" target="_blank" style="display:block;padding:12px 28px;font-family:${FONT};font-size:15px;font-weight:700;line-height:20px;color:${dark};text-decoration:none;border-radius:6px">${esc(label)}</a>
      </td>
    </tr>
  </table>`;

// Chi tiết giao dịch: mỗi mục là nhãn nhỏ viết hoa phía trên, giá trị phía dưới. Giá trị dài (mã, email) tự xuống dòng
// nên không bị bóp hẹp như bảng hai cột trên màn hình nhỏ. Mục `strong` được nhấn bằng màu xanh và cỡ chữ lớn.
export const details = (rows: { label: string; value: string; strong?: boolean }[]) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="${TABLE}margin:4px 0 18px 0;border:1px solid ${LINE};border-radius:8px;background-color:#f9fafb">
    ${rows
      .map(
        (r, i) => `<tr><td style="padding:12px 16px;${i ? `border-top:1px solid ${LINE};` : ""}">
      <div style="font-family:${FONT};font-size:11px;line-height:16px;letter-spacing:0.06em;text-transform:uppercase;color:${MUTED}">${esc(r.label)}</div>
      <div style="margin-top:3px;font-family:${FONT};font-size:${r.strong ? 22 : 16}px;line-height:${r.strong ? 30 : 24}px;font-weight:${r.strong ? 700 : 600};color:${r.strong ? deep : INK};word-break:break-word">${r.value}</div>
    </td></tr>`,
      )
      .join("")}
  </table>`;

// Ghi chú nhỏ màu xám
export const note = (html: string) =>
  `<p style="margin:0 0 10px 0;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED}">${html}</p>`;

// Mã QR chuyển khoản (ảnh do SePay dựng sẵn, tải từ qr.sepay.vn)
export const qrImage = (src: string) =>
  `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="${TABLE}margin:0 0 18px 0"><tr><td align="center"><img src="${esc(src)}" width="220" height="220" alt="Mã QR chuyển khoản" style="display:block;border:1px solid ${LINE};border-radius:8px;max-width:100%;height:auto" /></td></tr></table>`;

export const supportLine = () =>
  note(`Cần hỗ trợ? Nhắn cho chúng mình qua fanpage <a href="${esc(facebookUrl)}" target="_blank" style="color:${deep};font-weight:700">${esc(company)}</a>.`);

// Lời chào cuối thư (nằm trong khung nội dung); khối tên + liên hệ + logo do khung chung dựng bên dưới
export const signature = () =>
  `<p style="margin:18px 0 0 0;font-family:${FONT};font-size:16px;line-height:25px;color:${BODY}"><strong>Trân trọng,<br />Đội ngũ ${esc(product)}</strong></p>`;

interface LayoutInput {
  title: string;
  preheader: string; // dòng xem trước trong hộp thư
  bodyHtml: string;
}

const link = (href: string, label: string) =>
  `<a href="${esc(href)}" target="_blank" style="color:${deep};font-weight:700;text-decoration:none">${esc(label)}</a>`;

export function renderLayout({ title, preheader, bodyHtml }: LayoutInput) {
  const host = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const year = new Date().getFullYear();
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
        .h1 { font-size: 20px !important; line-height: 28px !important; }
        .btn-wrap { width: 100% !important; }
      }
    </style>
  </head>
  <body style="width:100%;height:100%;padding:0;margin:0;background-color:${PAGE}">
    <div dir="ltr" lang="vi" style="background-color:${PAGE}">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${PAGE}">${esc(preheader)}</div>
      <table width="100%" cellspacing="0" cellpadding="0" role="none" style="${TABLE}width:100%;background-color:${PAGE}">
        <tr>
          <td class="outer" valign="top" align="center" style="padding:28px 12px;margin:0">
            <table class="card" width="600" cellpadding="0" cellspacing="0" bgcolor="#ffffff" align="center" role="none" style="${TABLE}background-color:#ffffff;width:100%;max-width:600px;border:1px solid ${LINE};border-radius:8px;overflow:hidden">
              <tr>
                <td bgcolor="${gold}" height="4" style="height:4px;line-height:4px;font-size:4px;background-color:${gold}">&nbsp;</td>
              </tr>
              <tr>
                <td class="px" align="left" style="padding:26px 32px 0 32px;font-size:0;line-height:0">
                  <img src="cid:${MAIL_IMAGES.logo.cid}" alt="${esc(MAIL_IMAGES.logo.alt)}" width="104" style="display:block;width:104px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none" />
                </td>
              </tr>
              <tr>
                <td class="px" align="left" style="padding:22px 32px 0 32px">
                  <h1 class="h1" style="margin:0;font-family:${FONT};font-size:22px;line-height:30px;font-weight:700;color:${INK}">${esc(title)}</h1>
                </td>
              </tr>
              <tr>
                <td class="px" align="left" style="padding:16px 32px 8px 32px">${bodyHtml}</td>
              </tr>
              <tr>
                <td class="px" style="padding:12px 32px 0 32px">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="${TABLE}"><tr><td style="padding:0;border-top:1px solid ${LINE};height:1px;line-height:1px;font-size:1px">&nbsp;</td></tr></table>
                </td>
              </tr>
              <tr>
                <td class="px" align="left" style="padding:16px 32px 28px 32px;font-family:${FONT};font-size:14px;line-height:22px;color:${INK}">
                  <span style="color:${deep};font-weight:700">${esc(company)}</span> <span style="color:${MUTED}">· ${esc(MAIL_BRAND.tagline)}</span><br />
                  <strong>${esc(founder)}</strong> <span style="color:${MUTED}">· Founder</span><br />
                  <span style="color:${MUTED}">Website:</span> ${link(siteUrl, host)} &nbsp;<span style="color:${MUTED}">·</span>&nbsp; <span style="color:${MUTED}">Fanpage:</span> ${link(facebookUrl, "Facebook")}
                </td>
              </tr>
            </table>
            <table width="600" cellpadding="0" cellspacing="0" align="center" role="none" style="${TABLE}width:100%;max-width:600px">
              <tr>
                <td class="px" align="center" style="padding:18px 32px 0 32px;font-family:${FONT};font-size:12px;line-height:18px;color:#9ca3af">
                  Email tự động từ hệ thống ${esc(product)}. Vui lòng không trả lời trực tiếp thư này.<br />
                  © ${year} ${esc(company)}. Bảo lưu mọi quyền.
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
