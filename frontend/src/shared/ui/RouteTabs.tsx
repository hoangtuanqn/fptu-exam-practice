import { NavLink } from "react-router-dom";

interface Tab {
  to: string;
  label: string;
}

// Hàng tab chuyển giữa các trang liên quan (mỗi tab vẫn là một địa chỉ riêng, liên kết cũ không hỏng). Cùng kiểu dáng với Segmented.
export function RouteTabs({ label, tabs }: { label: string; tabs: Tab[] }) {
  return (
    <nav aria-label={label} className="inline-flex h-10 max-w-full overflow-x-auto overflow-y-hidden rounded-full border border-outline [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((t, i) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            `md-state md-motion md-label-large inline-flex h-full shrink-0 items-center whitespace-nowrap px-3 sm:px-4 ${i > 0 ? "border-l border-outline" : ""} ${isActive ? "bg-secondary-container text-on-secondary-container" : "text-on-surface"}`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}

export const WALLET_TABS: Tab[] = [
  { to: "/account/deposit", label: "Nạp credit" },
  { to: "/account/transactions", label: "Lịch sử giao dịch" },
  { to: "/account/giftcode", label: "Giftcode" },
  { to: "/account/referral", label: "Giới thiệu bạn bè" },
];

export const HISTORY_TABS: Tab[] = [
  { to: "/account/attempts", label: "Bài đã làm" },
  { to: "/account/reports", label: "Báo cáo đáp án" },
];
