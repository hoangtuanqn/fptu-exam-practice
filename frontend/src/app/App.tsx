import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { Crown, FileText, Flame, Layers, NotebookPen, Download, BookOpen, Gift, History, MessageSquareWarning, UserPlus, ListChecks, GraduationCap, LayoutDashboard, UserRound, Wallet } from "lucide-react";
import { PanelLayout, type NavItem } from "@/shared/layout/PanelLayout";
import { Loading } from "@/shared/ui/Feedback";
import LoginPage from "@/features/auth/pages/LoginPage";
import RegisterPage from "@/features/auth/pages/RegisterPage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/features/auth/pages/ResetPasswordPage";
import VerifyEmailPage from "@/features/auth/pages/VerifyEmailPage";
import GithubCallbackPage from "@/features/auth/github/GithubCallbackPage";
import NotFoundPage from "./NotFoundPage";
import { ADMIN_NAV, adminRoutes } from "@/features/admin/admin.routes";
import { NoticeBell } from "@/features/admin/notices/NoticeBell";
import { GuestSync } from "@/features/guest-sync/GuestSync";
import { DailyCheckInPopup } from "@/features/check-in/DailyCheckInPopup";
import { GradeBridgeHost } from "@/features/grade/GradeBridgeHost";
import { FreeTurnNotice } from "@/features/link-reward/FreeTurnNotice";
import { WhatsNewDialog } from "@/features/changelog/WhatsNewDialog";
import PracticePage from "@/features/practice/PracticePage";

// "/" và "/exam/:threadId" dùng chung một thể hiện của trang để đổi địa chỉ không làm mất bài đang làm
function PracticeRoute() {
  const threadId = useParams().threadId;
  return <PracticePage threadId={threadId && /^\d{1,18}$/.test(threadId) ? threadId : undefined} />;
}
import { GuestOnly, RequireAuth } from "@/features/auth/guards";

// Panel tách riêng thành chunk: người chỉ luyện đề không phải tải code của panel
import { PageMeta } from "@/shared/seo/PageMeta";
const ChatWidget = lazy(() => import("@/features/chat/ChatWidget"));
// Thư viện thành phần M3 (chỉ khi chạy npm run dev)
const M3Gallery = import.meta.env.DEV ? lazy(() => import("@/features/design-system/M3Gallery")) : null;
const ClaimTurnPage = lazy(() => import("@/features/link-reward/ClaimTurnPage"));
const PublicDepositPage = lazy(() => import("@/features/account/pages/PublicDepositPage"));
const OverviewPage = lazy(() => import("@/features/account/pages/OverviewPage"));
const DepositPage = lazy(() => import("@/features/account/pages/DepositPage"));
const TransactionsPage = lazy(() => import("@/features/account/pages/TransactionsPage"));
const ExamStorePage = lazy(() => import("@/features/exam-store/ExamStorePage"));
const ReviewPage = lazy(() => import("@/features/review/ReviewPage"));
const SubjectPage = lazy(() => import("@/features/landing/SubjectPage"));
const PublicCatalogPage = lazy(() => import("@/features/exam-store/PublicCatalogPage"));
const FrequentPage = lazy(() => import("@/features/frequent/FrequentPage"));
const MaterialsPage = lazy(() => import("@/features/materials/MaterialsPage"));
const MaterialResultPage = lazy(() => import("@/features/materials/MaterialResultPage"));
const ChapterSetPage = lazy(() => import("@/features/chapter-set/ChapterSetPage"));
const ReviewPracticePage = lazy(() => import("@/features/review/ReviewPracticePage"));
const MyReportsPage = lazy(() => import("@/features/account/pages/MyReportsPage"));
const ReferralPage = lazy(() => import("@/features/account/pages/ReferralPage"));
const GiftCodePage = lazy(() => import("@/features/account/pages/GiftCodePage"));
const PeDownloadPage = lazy(() => import("@/features/pe/PeDownloadPage"));
const FeaturesPage = lazy(() => import("@/features/landing/FeaturesPage"));
const ChangelogPage = lazy(() => import("@/features/changelog/ChangelogPage"));
const PlanPage = lazy(() => import("@/features/plan/PlanPage"));
const GradesPage = lazy(() => import("@/features/grade/GradesPage"));
const ProfilePage = lazy(() => import("@/features/account/pages/ProfilePage"));

const AttemptsPage = lazy(() => import("@/features/history/pages/AttemptsPage"));
const AttemptDetailPage = lazy(() => import("@/features/history/pages/AttemptDetailPage"));

// Thanh bên của người dùng, xếp theo việc người học làm: tìm và làm đề -> ôn tập -> xem kết quả -> ví và Pro -> hồ sơ
const ACCOUNT_NAV: NavItem[] = [
  { to: "/account", label: "Tổng quan", icon: LayoutDashboard, end: true },
  { to: "/account/exams", label: "Kho đề", icon: BookOpen, group: "Luyện đề" },
  { to: "/account/chapters", label: "Bộ đề theo chương", icon: Layers, group: "Luyện đề" },
  { to: "/account/pe", label: "Tải đề thi PE", icon: Download, group: "Luyện đề" },
  { to: "/account/review", label: "Sổ câu sai", icon: NotebookPen, group: "Ôn tập" },
  { to: "/account/frequent", label: "Câu hay ra", icon: Flame, group: "Ôn tập" },
  { to: "/account/materials", label: "Phân tích slide", icon: FileText, group: "Ôn tập" },
  { to: "/account/attempts", label: "Lịch sử làm bài", icon: ListChecks, group: "Kết quả" },
  { to: "/account/reports", label: "Báo cáo đáp án", icon: MessageSquareWarning, group: "Kết quả" },
  { to: "/account/grades", label: "Điểm FAP", icon: GraduationCap, group: "Kết quả" },
  { to: "/pro", label: "Gói Pro", icon: Crown, group: "Ví và Pro" },
  { to: "/account/deposit", label: "Nạp credit", icon: Wallet, group: "Ví và Pro" },
  { to: "/account/transactions", label: "Lịch sử giao dịch", icon: History, group: "Ví và Pro" },
  { to: "/account/giftcode", label: "Giftcode", icon: Gift, group: "Ví và Pro" },
  { to: "/account/referral", label: "Giới thiệu bạn bè", icon: UserPlus, group: "Ví và Pro" },
  { to: "/account/profile", label: "Hồ sơ", icon: UserRound, group: "Tài khoản" },
];

// Đường dẫn cũ của Thư viện đề (và liên kết từ trang môn): chuyển sang Kho đề > Theo môn, giữ mã môn
function CatalogRedirect() {
  const { search } = useLocation();
  const subject = new URLSearchParams(search).get("subject");
  return <Navigate to={`/account/exams?tab=subject${subject ? `&subject=${encodeURIComponent(subject)}` : ""}`} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <PageMeta />
      <GuestSync />
      <GradeBridgeHost />
      <FreeTurnNotice />
      <DailyCheckInPopup />
      <WhatsNewDialog />
      <ChatWidget />
      <Routes>
        <Route path="/" element={<PracticeRoute />} />
        <Route path="/exam/:threadId" element={<PracticeRoute />} />
        {M3Gallery && <Route path="/dev/m3" element={<Suspense fallback={null}><M3Gallery /></Suspense>} />}

        {/* Bảng tính năng của hệ thống (để giới thiệu/chụp màn hình): công khai */}
        <Route path="/features" element={<FeaturesPage />} />
        {/* Kho đề công khai: khách xem môn và đề trước khi đăng ký */}
        <Route path="/kho-de" element={<PublicCatalogPage />} />
        {/* Trang giới thiệu từng môn (SEO): /mon/pro192 */}
        <Route path="/mon/:code" element={<SubjectPage />} />
        {/* Lịch sử thay đổi (Có gì mới) của web và tiện ích Chrome: công khai */}
        <Route path="/changelog" element={<ChangelogPage />} />

        {/* Trang bán gói Pro: công khai, khách bấm mua sẽ được dẫn đi đăng nhập */}
        <Route path="/pro" element={<PlanPage />} />

        {/* Xem lệnh nạp bằng liên kết: không cần đăng nhập */}
        <Route path="/deposit/:code" element={<PublicDepositPage />} />

        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* GitHub gọi lại trong cửa sổ nhỏ khi đăng nhập */}
        <Route path="/auth/github/callback" element={<GithubCallbackPage />} />

        {/* Mở từ email nên không chặn người đang đăng nhập */}
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/account" element={<PanelLayout title="Tài khoản" items={ACCOUNT_NAV} />}>
            <Route index element={<OverviewPage />} />
            <Route path="attempts" element={<AttemptsPage />} />
            <Route path="attempts/:id" element={<AttemptDetailPage />} />
            <Route path="deposit" element={<DepositPage />} />
            <Route path="deposit/:code" element={<DepositPage />} />
            <Route path="exams" element={<ExamStorePage />} />
            <Route path="catalog" element={<CatalogRedirect />} />
            <Route path="frequent" element={<FrequentPage />} />
            <Route path="materials" element={<MaterialsPage />} />
            <Route path="materials/:id" element={<MaterialResultPage />} />
            <Route path="chapters" element={<ChapterSetPage />} />
            <Route path="review" element={<ReviewPage />} />
            <Route path="review/practice" element={<ReviewPracticePage />} />
            <Route path="pe" element={<PeDownloadPage />} />
            <Route path="reports" element={<MyReportsPage />} />
            <Route path="grades" element={<GradesPage />} />
            <Route path="referral" element={<ReferralPage />} />
            <Route path="giftcode" element={<GiftCodePage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="nhan-luot" element={<ClaimTurnPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route element={<RequireAuth role="ADMIN" />}>
          <Route path="/admin" element={<PanelLayout title="Quản trị" items={ADMIN_NAV} collapsible actions={<NoticeBell />} />}>
            {adminRoutes}
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
