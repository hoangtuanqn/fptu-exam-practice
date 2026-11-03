import { MAIL_BRAND, type MailBanner } from "../constants/mail";

// Khung chung của mọi email (dựng từ FStyle_BTC.html: bảng 600px, banner, khung viền bo tròn, đường kẻ màu, chân thư).
// Email chỉ dùng CSS nội tuyến + bảng để hiển thị được trên Gmail/Outlook/Apple Mail.

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const { company, product, tagline, founder, facebookUrl, blue, cyan } = MAIL_BRAND;
const FONT = "Inter, Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const TABLE = "mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;";
export const TEXT = `color:#333333;font-size:16px;line-height:25px;font-family:${FONT};margin:0 0 14px 0;`;

// Các khối nội dung dùng trong thân thư
export const p = (html: string) => `<p style="${TEXT}">${html}</p>`;
export const heading = (text: string) => `<p style="${TEXT}"><strong>${esc(text)}</strong></p>`;
export const list = (items: string[]) =>
  `<ul style="${TEXT}margin-left:20px;padding-left:4px">${items.map((i) => `<li style="margin-bottom:8px">${i}</li>`).join("")}</ul>`;

export const button = (label: string, href: string) => `
  <table cellpadding="0" cellspacing="0" role="presentation" align="center" style="${TABLE}margin:8px auto 18px auto">
    <tr>
      <td align="center" bgcolor="${blue}" style="border-radius:12px">
        <a class="btn" href="${esc(href)}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:${FONT};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;background-color:${blue}">${esc(label)}</a>
      </td>
    </tr>
  </table>`;

// Bảng chi tiết giao dịch: mỗi dòng "nhãn ... giá trị"; dòng `strong` được nhấn mạnh
export const details = (rows: { label: string; value: string; strong?: boolean }[]) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="${TABLE}margin:4px 0 18px 0;border:1px solid #e3e8f0;border-radius:12px;background-color:#f6f9ff">
    ${rows
      .map(
        (r, i) => `<tr>
      <td style="padding:11px 16px;font-family:${FONT};font-size:14px;color:#667085;${i ? "border-top:1px solid #e3e8f0;" : ""}">${esc(r.label)}</td>
      <td align="right" style="padding:11px 16px;font-family:${FONT};font-size:${r.strong ? 17 : 14}px;font-weight:${r.strong ? 700 : 600};color:${r.strong ? blue : "#101828"};${i ? "border-top:1px solid #e3e8f0;" : ""}">${r.value}</td>
    </tr>`,
      )
      .join("")}
  </table>`;

// Ghi chú nhỏ màu xám cuối thư
export const note = (html: string) =>
  `<p style="margin:0 0 10px 0;font-family:${FONT};font-size:13px;line-height:20px;color:#667085">${html}</p>`;

// Mã QR chuyển khoản (ảnh do SePay dựng sẵn, tải từ qr.sepay.vn)
export const qrImage = (src: string) =>
  `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="${TABLE}margin:0 0 16px 0"><tr><td align="center"><img src="${esc(src)}" width="200" height="200" alt="Mã QR chuyển khoản" style="display:block;border:1px solid #e3e8f0;border-radius:12px;max-width:100%;height:auto" /></td></tr></table>`;

export const supportLine = () =>
  p(`Cần hỗ trợ? Nhắn cho chúng mình qua fanpage <a href="${esc(facebookUrl)}" target="_blank" style="color:${blue};font-weight:700">${esc(company)}</a>.`);

export const signature = () => `<p style="${TEXT}"><strong>Trân trọng,<br />${esc(company)}</strong></p>`;

interface LayoutInput {
  title: string; // tiêu đề viết hoa dưới banner
  preheader: string; // dòng xem trước trong hộp thư
  banner: MailBanner;
  bodyHtml: string;
}

export function renderLayout({ title, preheader, banner, bodyHtml }: LayoutInput) {
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
      a { text-decoration: none; }
      @media only screen and (max-width: 620px) {
        .wrap-body { width: 100% !important; }
        .cover { width: 100% !important; height: auto !important; }
        .btn { display: block !important; text-align: center !important; }
      }
    </style>
  </head>
  <body style="width:100%;height:100%;padding:0;margin:0">
    <div dir="ltr" lang="vi" style="background-color:#f1f1f1">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#f1f1f1">${esc(preheader)}</div>
      <table width="100%" cellspacing="0" cellpadding="0" role="none" style="${TABLE}width:100%;background-color:#f1f1f1">
        <tr>
          <td valign="top" align="center" style="padding:24px 0;margin:0">
            <table cellpadding="0" cellspacing="0" bgcolor="#ffffff" align="center" role="none" class="wrap-body" style="${TABLE}background-color:#ffffff;width:600px;max-width:100%">
              <tr>
                <td align="center" style="padding:20px 20px 0 20px;font-size:0">
                  <img class="cover" width="560" src="cid:${banner.cid}" alt="${esc(banner.alt)}" style="display:block;border:0;outline:none;text-decoration:none;border-radius:14px;max-width:100%;height:auto" />
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:22px 20px 0 20px">
                  <h1 style="margin:0;font-family:${FONT};font-size:22px;line-height:30px;font-weight:700;color:${blue}">${esc(title)}</h1>
                </td>
              </tr>
              <tr>
                <td align="left" style="padding:20px 20px 0 20px">
                  <div style="border:2px solid ${blue};border-radius:20px">
                    <div style="padding:18px 20px 6px 22px">${bodyHtml}</div>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:22px 20px 0 20px">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="${TABLE}">
                    <tr><td style="border-bottom:5px solid ${cyan};height:1px;line-height:1px;font-size:1px">&nbsp;</td></tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td align="left" style="padding:18px 20px 24px 20px">
                  <p style="margin:0;font-family:${FONT};font-size:16px;line-height:24px;color:${blue}"><strong>${esc(company)}</strong> <span style="color:#666666;font-size:13px">· ${esc(tagline)}</span></p>
                  <p style="margin:0;font-family:${FONT};font-size:14px;line-height:24px;color:#000000"><strong>Founder:</strong> ${esc(founder)}</p>
                  <p style="margin:0;font-family:${FONT};font-size:14px;line-height:24px;color:#000000"><strong>Facebook:</strong> <a href="${esc(facebookUrl)}" target="_blank" style="color:#000000">${esc(facebookUrl.replace(/^https?:\/\//, ""))}</a></p>
                  <p style="margin:12px 0 0 0;font-family:${FONT};font-size:12px;line-height:18px;color:#999999">Đây là email tự động từ hệ thống ${esc(product)}, vui lòng không trả lời trực tiếp.</p>
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
