import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { PanelLayout, type NavItem } from "@/shared/layout/PanelLayout";
import { NAV_ICON } from "@/shared/layout/navIcons";
import { BottomNav } from "@/shared/layout/BottomNav";
import { PageSkeleton } from "@/shared/ui/Skeleton";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { isUuid } from "@/shared/utils/uuid";
import LoginPage from "@/features/auth/pages/LoginPage";
import RegisterPage from "@/features/auth/pages/RegisterPage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/features/auth/pages/ResetPasswordPage";
import VerifyEmailPage from "@/features/auth/pages/VerifyEmailPage";
import GithubCallbackPage from "@/features/auth/github/GithubCallbackPage";
import NotFoundPage from "./NotFoundPage";
import { PresenceReporter } from "@/shared/realtime/PresenceReporter";
import { adminRoutes } from "@/features/admin/admin.routes";
import { AdminLayout } from "@/features/admin/AdminLayout";
import { GuestSync } from "@/features/guest-sync/GuestSync";
import { DailyCheckInPopup } from "@/features/check-in/DailyCheckInPopup";
import { GradeBridgeHost } from "@/features/grade/GradeBridgeHost";
import { FreeTurnNotice } from "@/features/link-reward/FreeTurnNotice";
import { WhatsNewDialog } from "@/features/changelog/WhatsNewDialog";
import PracticePage from "@/features/practice/PracticePage";
import { SemesterPromoBar } from "@/features/plan/SemesterPromoBar";
import { SearchProvider } from "@/features/search/GlobalSearch";

// Không hiện ưu đãi khi đang luyện câu sai (màn làm bài)
function AccountPromoBar() {
  return useLocation().pathname.startsWith("/account/review/practice") ? null : <SemesterPromoBar />;
}

// "/" và "/exam/:examId" dùng chung một thể hiện của trang để đổi địa chỉ không làm mất bài đang làm
function PracticeRoute() {
  const examId = useParams().examId;
  return <PracticePage examId={isUuid(examId) ? examId : undefined} />;
}
import { GuestOnly, RequireAuth } from "@/features/auth/guards";
import { UserNoticeBell } from "@/features/notifications/UserNoticeBell";

// Panel tách riêng thành chunk: người chỉ luyện đề không phải tải code của panel
import { PageMeta } from "@/shared/seo/PageMeta";
import { SeasonLayer } from "@/shared/season/SeasonContext";
import { ScrollToTop } from "@/shared/layout/ScrollToTop";
import { GoogleTagManager } from "@/shared/analytics/GoogleTagManager";
// Các trang lazy gom một chỗ để App tải sẵn khi trình duyệt rảnh (chuyển trang không phải chờ tải code)
const routePages = {
  ChatWidget: () => import("@/features/chat/ChatWidget"),
  ClaimTurnPage: () => import("@/features/link-reward/ClaimTurnPage"),
  PublicDepositPage: () => import("@/features/account/pages/PublicDepositPage"),
  UnsubscribePage: () => import("@/features/marketing/UnsubscribePage"),
  OverviewPage: () => import("@/features/account/pages/OverviewPage"),
  DepositPage: () => import("@/features/account/pages/DepositPage"),
  TransactionsPage: () => import("@/features/account/pages/TransactionsPage"),
  ExamStorePage: () => import("@/features/exam-store/ExamStorePage"),
  ReviewPage: () => import("@/features/review/ReviewPage"),
  SavedPage: () => import("@/features/saved/SavedPage"),
  ExamViewPage: () => import("@/features/exam-view/ExamViewPage"),
  ExamPreviewPage: () => import("@/features/exam-preview/ExamPreviewPage"),
  ExamTrialPage: () => import("@/features/exam-store/ExamTrialPage"),
  SubjectPage: () => import("@/features/landing/SubjectPage"),
  PublicCatalogPage: () => import("@/features/exam-store/PublicCatalogPage"),
  FrequentPage: () => import("@/features/frequent/FrequentPage"),
  FlashcardSubjectsPage: () => import("@/features/flashcard/FlashcardSubjectsPage"),
  FlashcardSubjectPage: () => import("@/features/flashcard/FlashcardSubjectPage"),
  MaterialsPage: () => import("@/features/materials/MaterialsPage"),
  MaterialResultPage: () => import("@/features/materials/MaterialResultPage"),
  ReviewPracticePage: () => import("@/features/review/ReviewPracticePage"),
  ContributePage: () => import("@/features/exam-contribution/ContributePage"),
  MyReportsPage: () => import("@/features/account/pages/MyReportsPage"),
  ReferralPage: () => import("@/features/account/pages/ReferralPage"),
  GiftCodePage: () => import("@/features/account/pages/GiftCodePage"),
  FeaturesPage: () => import("@/features/landing/FeaturesPage"),
  ChangelogPage: () => import("@/features/changelog/ChangelogPage"),
  PlanPage: () => import("@/features/plan/PlanPage"),
  GradesPage: () => import("@/features/grade/GradesPage"),
  CourseraPage: () => import("@/features/coursera/CourseraPage"),
  ProfilePage: () => import("@/features/account/pages/ProfilePage"),
  BadgesPage: () => import("@/features/badges/BadgesPage"),
  NotificationsPage: () => import("@/features/notifications/NotificationsPage"),
  AttemptsPage: () => import("@/features/history/pages/AttemptsPage"),
  AttemptReviewPage: () => import("@/features/history/pages/AttemptReviewPage"),
  AttemptDetailPage: () => import("@/features/history/pages/AttemptDetailPage"),
};

const ChatWidget = lazy(routePages.ChatWidget);
// Thư viện thành phần M3 (chỉ khi chạy npm run dev)
const M3Gallery = import.meta.env.DEV ? lazy(() => import("@/features/design-system/M3Gallery")) : null;
const ClaimTurnPage = lazy(routePages.ClaimTurnPage);
const PublicDepositPage = lazy(routePages.PublicDepositPage);
const UnsubscribePage = lazy(routePages.UnsubscribePage);
const OverviewPage = lazy(routePages.OverviewPage);
const DepositPage = lazy(routePages.DepositPage);
const TransactionsPage = lazy(routePages.TransactionsPage);
const ExamStorePage = lazy(routePages.ExamStorePage);
const ReviewPage = lazy(routePages.ReviewPage);
const SavedPage = lazy(routePages.SavedPage);
const ExamViewPage = lazy(routePages.ExamViewPage);
const ExamPreviewPage = lazy(routePages.ExamPreviewPage);
const ExamTrialPage = lazy(routePages.ExamTrialPage);
const SubjectPage = lazy(routePages.SubjectPage);
const PublicCatalogPage = lazy(routePages.PublicCatalogPage);
const FrequentPage = lazy(routePages.FrequentPage);
const FlashcardSubjectsPage = lazy(routePages.FlashcardSubjectsPage);
const FlashcardSubjectPage = lazy(routePages.FlashcardSubjectPage);
const MaterialsPage = lazy(routePages.MaterialsPage);
const MaterialResultPage = lazy(routePages.MaterialResultPage);
const ReviewPracticePage = lazy(routePages.ReviewPracticePage);
const ContributePage = lazy(routePages.ContributePage);
const MyReportsPage = lazy(routePages.MyReportsPage);
const ReferralPage = lazy(routePages.ReferralPage);
const GiftCodePage = lazy(routePages.GiftCodePage);
const FeaturesPage = lazy(routePages.FeaturesPage);
const ChangelogPage = lazy(routePages.ChangelogPage);
const PlanPage = lazy(routePages.PlanPage);
const GradesPage = lazy(routePages.GradesPage);
const CourseraPage = lazy(routePages.CourseraPage);
const ProfilePage = lazy(routePages.ProfilePage);
const BadgesPage = lazy(routePages.BadgesPage);
const NotificationsPage = lazy(routePages.NotificationsPage);

const AttemptsPage = lazy(routePages.AttemptsPage);
const AttemptReviewPage = lazy(routePages.AttemptReviewPage);
const AttemptDetailPage = lazy(routePages.AttemptDetailPage);

// Thanh bên của người dùng, xếp theo việc người học làm: tìm và làm đề -> ôn tập -> xem kết quả -> ví và Pro -> hồ sơ
const ACCOUNT_NAV: NavItem[] = [
  { to: "/account", label: "Tổng quan", icon: NAV_ICON.overview, end: true },
  { to: "/account/exams", label: "Kho đề", icon: NAV_ICON.library, group: "Luyện đề" },
  { to: "/account/contribute", label: "Đóng góp đề thi", icon: NAV_ICON.contribute, group: "Luyện đề" },
  { to: "/account/review", label: "Sổ câu sai", icon: NAV_ICON.review, group: "Ôn tập" },
  { to: "/account/saved", label: "Câu đã lưu", icon: NAV_ICON.saved, group: "Ôn tập" },
  { to: "/account/frequent", label: "Câu hay ra", icon: NAV_ICON.frequent, group: "Ôn tập" },
  { to: "/flashcard", label: "Flashcard", icon: NAV_ICON.flashcard, group: "Ôn tập" },
  // Tạm ẩn: { to: "/account/materials", label: "Phân tích slide", icon: FileText, group: "Ôn tập" },
  { to: "/account/attempts", label: "Lịch sử làm bài", icon: NAV_ICON.attempts, group: "Kết quả", also: ["/account/reports"] },
  { to: "/account/grades", label: "Điểm FAP", icon: NAV_ICON.grades, group: "Kết quả" },
  { to: "/pro", label: "Gói Pro", icon: NAV_ICON.pro, group: "Ví và Pro" },
  { to: "/account/deposit", label: "Nạp credit", icon: NAV_ICON.deposit, group: "Ví và Pro" },
  { to: "/account/transactions", label: "Lịch sử giao dịch", icon: NAV_ICON.transactions, group: "Ví và Pro" },
  { to: "/account/giftcode", label: "Mã quà tặng", icon: NAV_ICON.giftcode, group: "Ưu đãi" },
  { to: "/account/referral", label: "Giới thiệu bạn bè", icon: NAV_ICON.referral, group: "Ưu đãi" },
  { to: "/account/coursera", label: "Đặt đơn Coursera", icon: NAV_ICON.coursera, group: "Dịch vụ" },
  { to: "/account/badges", label: "Huy hiệu", icon: NAV_ICON.badges, group: "Tài khoản" },
  { to: "/account/profile", label: "Hồ sơ", icon: NAV_ICON.profile, group: "Tài khoản" },
];

// Đường dẫn cũ của Thư viện đề (và liên kết từ trang môn): chuyển sang Kho đề > Theo môn, giữ mã môn
function CatalogRedirect() {
  const { search } = useLocation();
  const subject = new URLSearchParams(search).get("subject");
  return <Navigate to={`/account/exams?tab=subject${subject ? `&subject=${encodeURIComponent(subject)}` : ""}`} replace />;
}

export default function App() {
  const { pathname } = useLocation();
  // Tải sẵn code các trang khi rảnh: bấm sang tab mới thì hiện ngay, không có khoảng trống chờ
  useEffect(() => {
    const run = () => Object.values(routePages).forEach((load) => void load());
    const id = window.requestIdleCallback ? window.requestIdleCallback(run) : window.setTimeout(run, 1500);
    return () => (window.cancelIdleCallback ? window.cancelIdleCallback(id) : clearTimeout(id));
  }, []);
  return (
    <SearchProvider>
    <Suspense fallback={<PageSkeleton />}>
      <PageMeta />
      <ScrollToTop />
      <GoogleTagManager />
      <GuestSync />
      <PresenceReporter />
      <GradeBridgeHost />
      <FreeTurnNotice />
      <DailyCheckInPopup />
      <WhatsNewDialog />
      <ChatWidget />
      <SeasonLayer />
      <BottomNav more={ACCOUNT_NAV} />
      <ErrorBoundary resetKey={pathname}>
      <Routes>
        <Route path="/" element={<PracticeRoute />} />
        <Route path="/exam/:examId" element={<PracticeRoute />} />
        {/* Xem đề chỉ đọc: công khai như trang làm đề (người xem cần có đề trong kho) */}
        <Route path="/exam/:examId/view" element={<ExamViewPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/attempts/:id/review" element={<AttemptReviewPage />} />
        </Route>
        <Route path="/exam/:examId/preview" element={<ExamPreviewPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/exam/:examId/trial" element={<ExamTrialPage />} />
        </Route>
        {M3Gallery && <Route path="/dev/m3" element={<Suspense fallback={null}><M3Gallery /></Suspense>} />}

        {/* Bảng tính năng của hệ thống (để giới thiệu/chụp màn hình): công khai */}
        <Route path="/features" element={<FeaturesPage />} />
        {/* Kho đề công khai: khách xem môn và đề trước khi đăng ký */}
        <Route path="/kho-de" element={<PublicCatalogPage />} />
        {/* Trang giới thiệu từng môn (SEO): /mon/pro192 */}
        <Route path="/mon/:code" element={<SubjectPage />} />
        {/* Flashcard theo môn: danh sách môn công khai, xem thẻ phải đăng nhập */}
        <Route path="/flashcard" element={<FlashcardSubjectsPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/flashcard/:code" element={<FlashcardSubjectPage />} />
        </Route>
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
        <Route path="/unsubscribe" element={<UnsubscribePage />} />

        <Route element={<RequireAuth />}>
          {/* Đường dẫn cũ của tiện ích Chrome: đưa về Kho đề */}
          <Route path="/fetch" element={<Navigate to="/account/exams" replace />} />
          <Route path="/account" element={<PanelLayout title="Tài khoản" items={ACCOUNT_NAV} notice={<AccountPromoBar />} actions={<UserNoticeBell />} bottomNav />}>
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
            <Route path="chapters" element={<Navigate to="/account/exams?tab=chapters" replace />} />
            <Route path="review" element={<ReviewPage />} />
            <Route path="review/practice" element={<ReviewPracticePage />} />
            <Route path="saved" element={<SavedPage />} />
            <Route path="pe" element={<Navigate to="/" replace />} />
            <Route path="reports" element={<MyReportsPage />} />
            <Route path="contribute" element={<ContributePage />} />
            <Route path="grades" element={<GradesPage />} />
            <Route path="referral" element={<ReferralPage />} />
            <Route path="giftcode" element={<GiftCodePage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="nhan-luot" element={<ClaimTurnPage />} />
            <Route path="coursera" element={<CourseraPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="badges" element={<BadgesPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>
        </Route>

        <Route element={<RequireAuth role="ADMIN" />}>
          <Route path="/admin" element={<AdminLayout />}>
            {adminRoutes}
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </ErrorBoundary>
    </Suspense>
    </SearchProvider>
  );
}
