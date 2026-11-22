import { useState } from "react";
import { CircleHelp } from "lucide-react";
import { Modal, ModalTitle } from "@/shared/ui/Modal";
import { IconButton } from "@/shared/ui/Button";
import { ADMIN_NAV } from "@/features/admin/admin.routes";

// Mô tả ngắn từng mục menu (khoá theo đường dẫn); mục nào thiếu thì chỉ hiện tên
const DESC: Record<string, string> = {
  "/admin": "Số liệu chung: người dùng, doanh thu, hoạt động gần đây",
  "/admin/users": "Danh sách tài khoản, gói Pro, số dư, khoá/mở khoá",
  "/admin/referrals": "Ai giới thiệu ai và thưởng giới thiệu",
  "/admin/account-settings": "Quy tắc đăng ký tài khoản mới",
  "/admin/attempts": "Các lượt làm bài của người dùng",
  "/admin/deposits": "Lệnh nạp tiền và trạng thái xử lý",
  "/admin/bank-transactions": "Giao dịch ngân hàng nhận về, đối soát với lệnh nạp",
  "/admin/wallet": "Mọi lần cộng/trừ credit trong ví",
  "/admin/purchases": "Các lần mua đề, gói và dịch vụ",
  "/admin/gift-codes": "Tạo và theo dõi giftcode",
  "/admin/sepay": "Cấu hình cổng nhận tiền SePay",
  "/admin/exams": "Xem, sửa, ẩn/hiện đề thi trong kho",
  "/admin/exam-upload": "Tải đề mới lên từ thư mục/tệp",
  "/admin/exam-gaps": "Môn/đề còn thiếu cần bổ sung",
  "/admin/contributions": "Đề do người dùng gửi, chờ duyệt",
  "/admin/subjects": "Thêm, sửa, sắp xếp môn học",
  "/admin/fuo-sources": "Danh sách nguồn đề từ FuOverflow và quét đề mới",
  "/admin/crawler": "Cấu hình cách hệ thống lấy đề",
  "/admin/crawl-jobs": "Lịch sử các lần lấy đề của người dùng",
  "/admin/reports": "Người dùng báo đáp án sai, cần xử lý",
  "/admin/explanation-feedback": "Đánh giá tốt/xấu của người dùng về lời giải AI",
  "/admin/quality": "Đề nào nhiều lỗi, nhiều báo cáo",
  "/admin/ai": "Cấu hình AI giải đáp án",
  "/admin/chatbot": "Cấu hình chatbot hỗ trợ",
  "/admin/funnel": "Người dùng đi từ truy cập tới trả tiền ra sao",
  "/admin/promotions": "Ưu đãi, khuyến mãi hiển thị cho người dùng",
  "/admin/marketing": "Gửi email marketing",
  "/admin/system-notices": "Gửi thông báo tới người dùng",
  "/admin/link-rewards": "Cấu hình lượt miễn phí khi vượt link",
  "/admin/coursera": "Quản lý dịch vụ Coursera",
};

// Nút "?" trên thanh trên: mở bảng hướng dẫn liệt kê các nhóm menu và từng mục bên trong
export function AdminGuide() {
  const [open, setOpen] = useState(false);
  const groups = ADMIN_NAV.reduce<Record<string, typeof ADMIN_NAV>>((acc, it) => {
    (acc[it.group ?? ""] ??= []).push(it);
    return acc;
  }, {});

  return (
    <>
      <IconButton label="Hướng dẫn menu quản trị" onClick={() => setOpen(true)}>
        <CircleHelp size={22} />
      </IconButton>
      {open && (
        <Modal wide onClose={() => setOpen(false)}>
          <ModalTitle icon={CircleHelp}>Hướng dẫn menu quản trị</ModalTitle>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {Object.entries(groups).map(([name, items]) => (
              <section key={name}>
                <h3 className="md-title-small mb-1 text-primary">{name}</h3>
                <ul className="space-y-1.5">
                  {items.map((it) => (
                    <li key={it.to} className="md-body-medium flex items-start gap-2">
                      <it.icon size={16} className="mt-0.5 shrink-0 text-on-surface-variant" />
                      <span>
                        <span className="text-on-surface">{it.label}</span>
                        {DESC[it.to] && <span className="text-on-surface-variant"> — {DESC[it.to]}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
