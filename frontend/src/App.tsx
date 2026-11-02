import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { History, Landmark, LayoutDashboard, Receipt, Settings, UserRound, Users, Wallet } from "lucide-react";
import { PanelLayout, type NavItem } from "./components/layout/PanelLayout";
import { Loading } from "./components/ui/Feedback";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import NotFoundPage from "./pages/NotFoundPage";
import PracticePage from "./pages/PracticePage";
import { GuestOnly, RequireAuth } from "./routes/guards";

// Panel tách riêng thành chunk: người chỉ luyện đề không phải tải code của panel
const OverviewPage = lazy(() => import("./pages/account/OverviewPage"));
const DepositPage = lazy(() => import("./pages/account/DepositPage"));
const TransactionsPage = lazy(() => import("./pages/account/TransactionsPage"));
const ProfilePage = lazy(() => import("./pages/account/ProfilePage"));

const DashboardPage = lazy(() => import("./pages/admin/DashboardPage"));
const UsersPage = lazy(() => import("./pages/admin/UsersPage"));
const DepositsPage = lazy(() => import("./pages/admin/DepositsPage"));
const BankTransactionsPage = lazy(() => import("./pages/admin/BankTransactionsPage"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));

const ACCOUNT_NAV: NavItem[] = [
  { to: "/account", label: "Tổng quan", icon: LayoutDashboard, end: true },
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
];

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<PracticePage />} />

        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/account" element={<PanelLayout title="Tài khoản" items={ACCOUNT_NAV} />}>
            <Route index element={<OverviewPage />} />
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
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
