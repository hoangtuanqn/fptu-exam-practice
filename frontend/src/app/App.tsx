import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { DatabaseZap, History, Landmark, ListChecks, LayoutDashboard, Receipt, Settings, UserRound, Users, Wallet } from "lucide-react";
import { PanelLayout, type NavItem } from "@/shared/layout/PanelLayout";
import { Loading } from "@/shared/ui/Feedback";
import LoginPage from "@/features/auth/pages/LoginPage";
import RegisterPage from "@/features/auth/pages/RegisterPage";
import NotFoundPage from "./NotFoundPage";
import { GuestSync } from "@/features/guest-sync/GuestSync";
import PracticePage from "@/features/practice/PracticePage";
import { GuestOnly, RequireAuth } from "@/features/auth/guards";

// Panel tách riêng thành chunk: người chỉ luyện đề không phải tải code của panel
const OverviewPage = lazy(() => import("@/features/account/pages/OverviewPage"));
const DepositPage = lazy(() => import("@/features/account/pages/DepositPage"));
const TransactionsPage = lazy(() => import("@/features/account/pages/TransactionsPage"));
const ProfilePage = lazy(() => import("@/features/account/pages/ProfilePage"));

const DashboardPage = lazy(() => import("@/features/admin/pages/DashboardPage"));
const UsersPage = lazy(() => import("@/features/admin/pages/UsersPage"));
const DepositsPage = lazy(() => import("@/features/admin/pages/DepositsPage"));
const BankTransactionsPage = lazy(() => import("@/features/admin/pages/BankTransactionsPage"));
const SettingsPage = lazy(() => import("@/features/admin/pages/SettingsPage"));
const AttemptsPage = lazy(() => import("@/features/history/pages/AttemptsPage"));
const AttemptDetailPage = lazy(() => import("@/features/history/pages/AttemptDetailPage"));
const CrawlerPage = lazy(() => import("@/features/admin/pages/CrawlerPage"));

const ACCOUNT_NAV: NavItem[] = [
  { to: "/account", label: "Tổng quan", icon: LayoutDashboard, end: true },
  { to: "/account/attempts", label: "Lịch sử làm bài", icon: ListChecks },
  { to: "/account/deposit", label: "Nạp tiền", icon: Wallet },
  { to: "/account/transactions", label: "Lịch sử giao dịch", icon: History },
  { to: "/account/profile", label: "Hồ sơ", icon: UserRound },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Tổng quan", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Thành viên", icon: Users },
  { to: "/admin/deposits", label: "Lệnh nạp tiền", icon: Receipt },
  { to: "/admin/bank-transactions", label: "Giao dịch ngân hàng", icon: Landmark },
  { to: "/admin/settings", label: "Cấu hình SePay", icon: Settings },
  { to: "/admin/crawler", label: "Cấu hình crawl", icon: DatabaseZap },
];

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <GuestSync />
      <Routes>
        <Route path="/" element={<PracticePage />} />

        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/account" element={<PanelLayout title="Tài khoản" items={ACCOUNT_NAV} />}>
            <Route index element={<OverviewPage />} />
            <Route path="attempts" element={<AttemptsPage />} />
            <Route path="attempts/:id" element={<AttemptDetailPage />} />
            <Route path="deposit" element={<DepositPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route element={<RequireAuth role="ADMIN" />}>
          <Route path="/admin" element={<PanelLayout title="Quản trị" items={ADMIN_NAV} />}>
            <Route index element={<DashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="deposits" element={<DepositsPage />} />
            <Route path="bank-transactions" element={<BankTransactionsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="crawler" element={<CrawlerPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
