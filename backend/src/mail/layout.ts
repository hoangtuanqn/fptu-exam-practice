import { MAIL_BRAND, MAIL_IMAGES } from "../constants/mail";

// Khung chung của mọi email, theo mẫu FStyle_MC.html: thẻ trắng 600px trên nền xám nhạt, ảnh bìa, tiêu đề chữ HOA màu thương hiệu,
// nội dung nằm trong khung bo tròn viền xanh, rồi khối chữ ký (tên + liên hệ + logo), vạch nhấn và hàng liên kết mạng xã hội.
// Màu vàng của mascot Cóc Pass (vàng #ffc61f, chữ nâu đậm #3f2606). Chỉ dùng CSS nội tuyến + bảng để chạy được trên Gmail/Outlook/Apple Mail.

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const { company, product, founder, facebookUrl, siteUrl, gold, deep, dark } = MAIL_BRAND;
const FONT = "Inter, sans-serif"; // Inter (Apple Mail, iOS, Outlook.com tải được); ứng dụng không hỗ trợ phông web thì dùng phông sans-serif mặc định
const TABLE = "mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;";
const INK = "#101828"; // chữ đậm
const BODY = "#333333"; // chữ nội dung
const MUTED = "#667085"; // chữ phụ
const LINE = "#e4e9f1"; // đường kẻ mảnh
const PAGE = "#f8f4e6"; // nền ngoài thẻ

const TEXT = `margin:0 0 14px 0;font-family:${FONT};font-size:16px;line-height:25px;color:${BODY};`;

// ---- Các khối dùng trong thân thư

export const p = (html: string) => `<p style="${TEXT}">${html}</p>`;

export const heading = (text: string) =>
  `<p style="margin:18px 0 8px 0;font-family:${FONT};font-size:16px;line-height:24px;font-weight:700;color:${INK}">${esc(text)}</p>`;

export const list = (items: string[]) =>
  `<ul style="${TEXT}margin-left:20px;padding-left:4px">${items.map((i) => `<li style="margin-bottom:8px">${i}</li>`).join("")}</ul>`;

// Nút rộng hết bề ngang: dễ bấm trên điện thoại, vẫn gọn trên máy tính
export const button = (label: string, href: string) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="${TABLE}margin:8px 0 18px 0">
    <tr>
      <td align="center" bgcolor="${gold}" style="border-radius:10px;background-color:${gold}">
        <a class="btn" href="${esc(href)}" target="_blank" style="display:block;padding:14px 20px;font-family:${FONT};font-size:16px;font-weight:700;line-height:20px;color:${dark};text-decoration:none;border-radius:10px">${esc(label)}</a>
      </td>
    </tr>
  </table>`;

// Chi tiết giao dịch: mỗi mục là nhãn nhỏ viết hoa phía trên, giá trị phía dưới. Giá trị dài (mã, email) tự xuống dòng
// nên không bị bóp hẹp như bảng hai cột trên màn hình nhỏ. Mục `strong` được nhấn bằng màu xanh và cỡ chữ lớn.
export const details = (rows: { label: string; value: string; strong?: boolean }[]) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="${TABLE}margin:4px 0 18px 0;border:1px solid ${LINE};border-radius:12px;background-color:#fffbf0">
    ${rows
      .map(
        (r, i) => `<tr><td style="padding:12px 16px;${i ? `border-top:1px solid ${LINE};` : ""}">
      <div style="font-family:${FONT};font-size:11px;line-height:16px;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED}">${esc(r.label)}</div>
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
  `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="${TABLE}margin:0 0 18px 0"><tr><td align="center"><img src="${esc(src)}" width="220" height="220" alt="Mã QR chuyển khoản" style="display:block;border:1px solid ${LINE};border-radius:12px;max-width:100%;height:auto" /></td></tr></table>`;

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

// Nút liên kết nhỏ ở hàng cuối thư (thay cho biểu tượng mạng xã hội, không phụ thuộc ảnh ngoài)
const pill = (href: string, label: string) =>
  `<a href="${esc(href)}" target="_blank" style="display:inline-block;margin-left:8px;padding:7px 16px;border:1px solid ${deep};border-radius:999px;font-family:${FONT};font-size:14px;line-height:20px;font-weight:700;color:${deep};text-decoration:none">${esc(label)}</a>`;

export function renderLayout({ title, preheader, bodyHtml }: LayoutInput) {
  const host = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
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
        .px { padding-left: 14px !important; padding-right: 14px !important; }
        .box { padding: 14px 16px !important; }
        .h1 { font-size: 19px !important; line-height: 26px !important; }
        .sig-text, .sig-logo { display: block !important; width: 100% !important; }
        .sig-logo { padding-top: 14px !important; text-align: left !important; }
        .links { text-align: left !important; }
      }
    </style>
  </head>
  <body style="width:100%;height:100%;padding:0;margin:0;background-color:${PAGE}">
    <div dir="ltr" lang="vi" style="background-color:${PAGE}">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${PAGE}">${esc(preheader)}</div>
      <table width="100%" cellspacing="0" cellpadding="0" role="none" style="${TABLE}width:100%;background-color:${PAGE}">
        <tr>
          <td class="outer" valign="top" align="center" style="padding:24px 12px;margin:0">
            <table width="600" cellpadding="0" cellspacing="0" bgcolor="#ffffff" align="center" role="none" style="${TABLE}background-color:#ffffff;width:100%;max-width:600px;border-radius:12px;overflow:hidden">
              <tr>
                <td class="px" align="center" style="padding:20px 20px 0 20px;font-size:0;line-height:0">
                  <img width="560" height="140" src="cid:${MAIL_IMAGES.cover.cid}" alt="${esc(MAIL_IMAGES.cover.alt)}" style="display:block;width:100%;max-width:560px;height:auto;border:0;outline:none;text-decoration:none;border-radius:10px" />
                </td>
              </tr>
              <tr>
                <td class="px" align="center" style="padding:22px 20px 4px 20px">
                  <h1 class="h1" style="margin:0;font-family:${FONT};font-size:22px;line-height:30px;font-weight:700;letter-spacing:0.02em;color:${deep}">${esc(title.toLocaleUpperCase("vi-VN"))}</h1>
                </td>
              </tr>
              <tr>
                <td class="px" align="left" style="padding:14px 20px 0 20px">
                  <div class="box" style="border:2px solid ${gold};border-radius:20px;padding:18px 22px 20px 22px">${bodyHtml}</div>
                </td>
              </tr>
              <tr>
                <td class="px" align="left" style="padding:20px 20px 0 20px">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="${TABLE}">
                    <tr>
                      <td class="sig-text" valign="top" align="left" style="padding:0 0 0 20px;font-family:${FONT};font-size:15px;line-height:24px;color:${INK}">
                        <span style="color:${deep};font-weight:700">${esc(company)}</span> <span style="color:${MUTED}">· ${esc(MAIL_BRAND.tagline)}</span><br />
                        <strong>${esc(founder)}</strong> <span style="color:${MUTED}">· Founder</span><br />
                        <strong>Website:</strong> ${link(siteUrl, host)}<br />
                        <strong>Fanpage:</strong> ${link(facebookUrl, facebookUrl.replace(/^https?:\/\/(www\.)?/, ""))}
                      </td>
                      <td class="sig-logo" valign="top" align="right" width="130" style="padding:0;font-size:0;width:130px">
                        <img src="cid:${MAIL_IMAGES.logo.cid}" alt="${esc(MAIL_IMAGES.logo.alt)}" width="120" style="display:block;width:120px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none" />
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td class="px" style="padding:18px 20px 0 20px">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="${TABLE}"><tr><td style="padding:0;border-bottom:5px solid ${gold};height:1px;line-height:1px;font-size:1px">&nbsp;</td></tr></table>
                </td>
              </tr>
              <tr>
                <td class="px links" align="right" style="padding:16px 20px 6px 20px">${pill(siteUrl, "Website")}${pill(facebookUrl, "Facebook")}</td>
              </tr>
              <tr>
                <td class="px" align="left" style="padding:8px 20px 24px 20px">
                  <p style="margin:0;font-family:${FONT};font-size:12px;line-height:18px;color:#98a2b3">Email tự động từ hệ thống ${esc(product)}. Vui lòng không trả lời trực tiếp thư này.</p>
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
