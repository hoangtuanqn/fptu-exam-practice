import { BANNER_CID, MAIL_BRAND } from "../../constants/mail";

// Dựng từ khung của FStyle_BTC.html (bố cục bảng 600px, banner trên cùng, khung viền bo tròn chứa nội dung,
// đường kẻ màu, chân thư thông tin liên hệ), đổi sang nhận diện MST Software và nội dung đặt lại mật khẩu.
// Email chỉ dùng CSS nội tuyến + bảng để hiển thị được trên Gmail/Outlook/Apple Mail.

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const FONT = "Inter, Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const TEXT = `color:#333333;font-size:16px;line-height:25px;font-family:${FONT};margin:0 0 14px 0;`;
const TABLE = "mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;";

export interface ResetEmailInput {
  name: string;
  link: string;
  expiresMin: number;
}

export function renderResetPasswordEmail({ name, link, expiresMin }: ResetEmailInput) {
  const { company, product, tagline, founder, facebookUrl, blue, cyan } = MAIL_BRAND;
  const safeName = esc(name);
  const safeLink = esc(link);

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta content="width=device-width, initial-scale=1" name="viewport" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta content="telephone=no" name="format-detection" />
    <title>Khôi phục mật khẩu - ${esc(product)}</title>
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
        .col { display: block !important; width: 100% !important; }
        .btn { display: block !important; text-align: center !important; }
      }
    </style>
  </head>
  <body style="width:100%;height:100%;padding:0;margin:0">
    <div dir="ltr" lang="vi" style="background-color:#f1f1f1">
      <!-- Ẩn dòng xem trước trong hộp thư -->
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#f1f1f1">
        Nhấn vào liên kết để đặt lại mật khẩu. Liên kết có hiệu lực ${expiresMin} phút.
      </div>
      <table width="100%" cellspacing="0" cellpadding="0" role="none" style="${TABLE}width:100%;background-color:#f1f1f1">
        <tr>
          <td valign="top" align="center" style="padding:24px 0;margin:0">

            <!-- Banner -->
            <table cellpadding="0" cellspacing="0" bgcolor="#ffffff" align="center" role="none" class="wrap-body" style="${TABLE}background-color:#ffffff;width:600px;max-width:100%">
              <tr>
                <td align="center" style="padding:20px 20px 0 20px;font-size:0">
                  <img class="cover" width="560" src="cid:${BANNER_CID}" alt="Quên mật khẩu? Đặt lại chỉ trong vài bước" style="display:block;border:0;outline:none;text-decoration:none;border-radius:14px;max-width:100%;height:auto" />
                </td>
              </tr>

              <!-- Tiêu đề -->
              <tr>
                <td align="center" style="padding:22px 20px 0 20px">
                  <h1 style="margin:0;font-family:${FONT};font-size:22px;line-height:30px;font-weight:700;color:${blue}">KHÔI PHỤC MẬT KHẨU TÀI KHOẢN</h1>
                </td>
              </tr>

              <!-- Khung nội dung viền xanh bo tròn -->
              <tr>
                <td align="left" style="padding:20px 20px 0 20px">
                  <div style="border:2px solid ${blue};border-radius:20px">
                    <div style="padding:18px 20px 6px 22px">
                      <p style="${TEXT}"><strong>Xin chào ${safeName},</strong></p>
                      <p style="${TEXT}">
                        Chúng mình là <strong>${esc(company)}</strong>, đơn vị phát triển <strong>${esc(product)}</strong>.
                        Chúng mình vừa nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn nút bên dưới để tạo mật khẩu mới:
                      </p>

                      <table cellpadding="0" cellspacing="0" role="presentation" align="center" style="${TABLE}margin:8px auto 18px auto">
                        <tr>
                          <td align="center" bgcolor="${blue}" style="border-radius:12px">
                            <a class="btn" href="${safeLink}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:${FONT};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;background-color:${blue}">Đặt lại mật khẩu</a>
                          </td>
                        </tr>
                      </table>

                      <p style="${TEXT}"><strong>Thông tin về liên kết</strong></p>
                      <ul style="${TEXT}margin-left:20px;padding-left:4px">
                        <li style="margin-bottom:8px">Liên kết có hiệu lực trong <strong>${expiresMin} phút</strong> và chỉ dùng được <strong>một lần</strong>.</li>
                        <li style="margin-bottom:8px">Nếu nút không bấm được, hãy sao chép địa chỉ sau và dán vào trình duyệt:<br />
                          <a href="${safeLink}" target="_blank" style="color:${blue};word-break:break-all;font-size:14px">${safeLink}</a>
                        </li>
                      </ul>

                      <p style="${TEXT}"><strong>Lưu ý quan trọng về bảo mật</strong></p>
                      <ul style="${TEXT}margin-left:20px;padding-left:4px">
                        <li style="margin-bottom:8px">Nếu <strong>không phải bạn</strong> yêu cầu, hãy bỏ qua email này. Mật khẩu hiện tại vẫn an toàn và không bị thay đổi.</li>
                        <li style="margin-bottom:8px">Không chia sẻ liên kết này cho bất kỳ ai, kể cả người tự nhận là nhân viên hỗ trợ.</li>
                        <li style="margin-bottom:8px">Chọn mật khẩu mới có ít nhất 8 ký tự, gồm cả chữ và số, và không trùng với mật khẩu ở nơi khác.</li>
                      </ul>

                      <p style="${TEXT}">
                        Cần hỗ trợ? Nhắn cho chúng mình qua fanpage
                        <a href="${esc(facebookUrl)}" target="_blank" style="color:${blue};font-weight:700">${esc(company)}</a>.
                      </p>
                      <p style="${TEXT}"><strong>Trân trọng,<br />${esc(company)}</strong></p>
                    </div>
                  </div>
                </td>
              </tr>

              <!-- Đường kẻ màu (cyan trong gradient logo) -->
              <tr>
                <td style="padding:22px 20px 0 20px">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="${TABLE}">
                    <tr><td style="border-bottom:5px solid ${cyan};height:1px;line-height:1px;font-size:1px">&nbsp;</td></tr>
                  </table>
                </td>
              </tr>

              <!-- Chân thư -->
              <tr>
                <td align="left" style="padding:18px 20px 24px 20px">
                  <p style="margin:0;font-family:${FONT};font-size:16px;line-height:24px;color:${blue}"><strong>${esc(company)}</strong> <span style="color:#666666;font-size:13px">· ${esc(tagline)}</span></p>
                  <p style="margin:0;font-family:${FONT};font-size:14px;line-height:24px;color:#000000"><strong>Founder:</strong> ${esc(founder)}</p>
                  <p style="margin:0;font-family:${FONT};font-size:14px;line-height:24px;color:#000000">
                    <strong>Facebook:</strong> <a href="${esc(facebookUrl)}" target="_blank" style="color:#000000">${esc(facebookUrl.replace(/^https?:\/\//, ""))}</a>
                  </p>
                  <p style="margin:12px 0 0 0;font-family:${FONT};font-size:12px;line-height:18px;color:#999999">
                    Đây là email tự động từ hệ thống ${esc(product)}, vui lòng không trả lời trực tiếp.
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>
    </div>
  </body>
</html>`;

  const text = [
    `Xin chào ${name},`,
    "",
    `Chúng mình vừa nhận được yêu cầu đặt lại mật khẩu cho tài khoản ${product} của bạn.`,
    `Mở liên kết sau để tạo mật khẩu mới (hiệu lực ${expiresMin} phút, dùng một lần):`,
    link,
    "",
    "Nếu không phải bạn yêu cầu, hãy bỏ qua email này, mật khẩu hiện tại vẫn an toàn.",
    "Không chia sẻ liên kết này cho bất kỳ ai.",
    "",
    `Trân trọng,`,
    company,
  ].join("\n");

  return { html, text };
}
