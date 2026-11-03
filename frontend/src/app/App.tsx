import { lazy, Suspense } from "react";
import { Route, Routes, useParams } from "react-router-dom";
import { BookOpen, Gift, History, MessageSquareWarning, UserPlus, ListChecks, LayoutDashboard, UserRound, Wallet } from "lucide-react";
import { PanelLayout, type NavItem } from "@/shared/layout/PanelLayout";
import { Loading } from "@/shared/ui/Feedback";
import LoginPage from "@/features/auth/pages/LoginPage";
import RegisterPage from "@/features/auth/pages/RegisterPage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/features/auth/pages/ResetPasswordPage";
import NotFoundPage from "./NotFoundPage";
import { ADMIN_NAV, adminRoutes } from "@/features/admin/admin.routes";
import { GuestSync } from "@/features/guest-sync/GuestSync";
import PracticePage from "@/features/practice/PracticePage";

// "/" và "/exam/:threadId" dùng chung một thể hiện của trang để đổi địa chỉ không làm mất bài đang làm
function PracticeRoute() {
  const threadId = useParams().threadId;
  return <PracticePage threadId={threadId && /^\d{1,18}$/.test(threadId) ? threadId : undefined} />;
}
import { GuestOnly, RequireAuth } from "@/features/auth/guards";

// Panel tách riêng thành chunk: người chỉ luyện đề không phải tải code của panel
const PublicDepositPage = lazy(() => import("@/features/account/pages/PublicDepositPage"));
const OverviewPage = lazy(() => import("@/features/account/pages/OverviewPage"));
const DepositPage = lazy(() => import("@/features/account/pages/DepositPage"));
const TransactionsPage = lazy(() => import("@/features/account/pages/TransactionsPage"));
const LibraryPage = lazy(() => import("@/features/account/pages/LibraryPage"));
const MyReportsPage = lazy(() => import("@/features/account/pages/MyReportsPage"));
const ReferralPage = lazy(() => import("@/features/account/pages/ReferralPage"));
const GiftCodePage = lazy(() => import("@/features/account/pages/GiftCodePage"));
const ProfilePage = lazy(() => import("@/features/account/pages/ProfilePage"));

const AttemptsPage = lazy(() => import("@/features/history/pages/AttemptsPage"));
const AttemptDetailPage = lazy(() => import("@/features/history/pages/AttemptDetailPage"));

const ACCOUNT_NAV: NavItem[] = [
  { to: "/account", label: "Tổng quan", icon: LayoutDashboard, end: true, group: "Chung" },
  { to: "/account/exams", label: "Kho đề của tôi", icon: BookOpen, group: "Học tập" },
  { to: "/account/reports", label: "Báo cáo đáp án", icon: MessageSquareWarning, group: "Học tập" },
  { to: "/account/attempts", label: "Lịch sử làm bài", icon: ListChecks, group: "Học tập" },
  { to: "/account/deposit", label: "Nạp credit", icon: Wallet, group: "Ví" },
  { to: "/account/referral", label: "Giới thiệu bạn bè", icon: UserPlus, group: "Ví" },
  { to: "/account/giftcode", label: "Giftcode", icon: Gift, group: "Ví" },
  { to: "/account/transactions", label: "Lịch sử giao dịch", icon: History, group: "Ví" },
  { to: "/account/profile", label: "Hồ sơ", icon: UserRound, group: "Cài đặt" },
];

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <GuestSync />
      <Routes>
        <Route path="/" element={<PracticeRoute />} />
        <Route path="/exam/:threadId" element={<PracticeRoute />} />

        {/* Xem lệnh nạp bằng liên kết: không cần đăng nhập */}
        <Route path="/deposit/:code" element={<PublicDepositPage />} />

        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Mở từ email nên không chặn người đang đăng nhập */}
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/account" element={<PanelLayout title="Tài khoản" items={ACCOUNT_NAV} />}>
            <Route index element={<OverviewPage />} />
            <Route path="attempts" element={<AttemptsPage />} />
            <Route path="attempts/:id" element={<AttemptDetailPage />} />
            <Route path="deposit" element={<DepositPage />} />
            <Route path="deposit/:code" element={<DepositPage />} />
            <Route path="exams" element={<LibraryPage />} />
            <Route path="reports" element={<MyReportsPage />} />
            <Route path="referral" element={<ReferralPage />} />
            <Route path="giftcode" element={<GiftCodePage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route element={<RequireAuth role="ADMIN" />}>
          <Route path="/admin" element={<PanelLayout title="Quản trị" items={ADMIN_NAV} />}>
            {adminRoutes}
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
