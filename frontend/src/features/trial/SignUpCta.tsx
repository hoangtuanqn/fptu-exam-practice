import { Link } from "react-router-dom";
import { buttonClass } from "@/shared/ui/Button";

// Lời mời đăng ký, dùng ở hộp thoại hết lượt thử và bảng điểm của khách
export function SignUpCta() {
  return (
    <div className="flex gap-2">
      <Link to="/register" className={buttonClass({ variant: "primary", grow: true, className: "!py-2.5" })}>
        Đăng ký miễn phí
      </Link>
      <Link to="/login" className={buttonClass({ grow: true, className: "!py-2.5" })}>
        Đăng nhập
      </Link>
    </div>
  );
}
