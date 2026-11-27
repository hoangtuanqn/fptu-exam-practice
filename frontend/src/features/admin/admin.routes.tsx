import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
import { NAV_ICON } from "@/shared/layout/navIcons";
import type { NavItem } from "@/shared/layout/PanelLayout";

/**
 * Trang quản trị chia theo module, mỗi module một thư mục trong features/admin:
 *   overview/  Tổng quan
 *   users/     Thành viên, giới thiệu
 *   finance/   Lệnh nạp, giao dịch ngân hàng, giftcode, cấu hình SePay
 *   content/   Đề thi, báo cáo đáp án, AI giải đáp án
 * Menu và đường dẫn khai báo ở đây, thêm trang mới chỉ cần sửa file này.
 */
const AdminCourseraPage = lazy(() => import("@/features/coursera/AdminCourseraPage"));
const AdminContributionsPage = lazy(() => import("@/features/exam-contribution/AdminContributionsPage"));
const AdminExamCommentsPage = lazy(() => import("@/features/exam-comments/AdminExamCommentsPage"));
const DashboardPage = lazy(() => import("./overview/DashboardPage"));
const UsersPage = lazy(() => import("./users/UsersPage"));
const UserDetailPage = lazy(() => import("./users/UserDetailPage"));
const PurchasesPage = lazy(() => import("./users/PurchasesPage"));
const WalletHistoryPage = lazy(() => import("./users/WalletHistoryPage"));
const CrawlJobsPage = lazy(() => import("./users/CrawlJobsPage"));
const AttemptsPage = lazy(() => import("./users/AttemptsPage"));
const AccountSettingsPage = lazy(() => import("./users/AccountSettingsPage"));
const LinkRewardSettingsPage = lazy(() => import("./content/LinkRewardSettingsPage"));
const PromoSettingsPage = lazy(() => import("./users/PromoSettingsPage"));
const DepositsPage = lazy(() => import("./finance/DepositsPage"));
const BankTransactionsPage = lazy(() => import("./finance/BankTransactionsPage"));
const ReferralsPage = lazy(() => import("./users/ReferralsPage"));
const GiftCodesPage = lazy(() => import("./finance/GiftCodesPage"));
const SepayPage = lazy(() => import("./finance/SepayPage"));
const ExamsPage = lazy(() => import("./content/ExamsPage"));
const ExamEditPage = lazy(() => import("./content/ExamEditPage"));
const ExamUploadPage = lazy(() => import("./exam-upload/ExamUploadPage"));
const ExamGapsPage = lazy(() => import("./exam-upload/ExamGapsPage"));
const ReportsPage = lazy(() => import("./content/ReportsPage"));
const FeedbackPage = lazy(() => import("./content/FeedbackPage"));
const ChatbotPage = lazy(() => import("./content/ChatbotPage"));
const AiPage = lazy(() => import("./content/AiPage"));
const SubjectsManagerPage = lazy(() => import("./content/SubjectsManagerPage"));
const NoticesPage = lazy(() => import("./notices/NoticesPage"));
const SystemNoticePage = lazy(() => import("./notices/SystemNoticePage"));
const OnlinePage = lazy(() => import("./users/OnlinePage"));
const FunnelPage = lazy(() => import("./insights/FunnelPage"));
const QualityPage = lazy(() => import("./insights/QualityPage"));
const MarketingPage = lazy(() => import("./marketing/MarketingPage"));
const AdminBadgesPage = lazy(() => import("./badges/AdminBadgesPage"));
const SeasonPage = lazy(() => import("./marketing/SeasonPage"));

export const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Tổng quan", icon: NAV_ICON.overview, end: true, group: "Chung" },
  { to: "/admin/users", label: "Thành viên", icon: NAV_ICON.users, group: "Người dùng" },
  { to: "/admin/online", label: "Đang online", icon: NAV_ICON.online, group: "Người dùng" },
  { to: "/admin/referrals", label: "Giới thiệu", icon: NAV_ICON.referral, group: "Người dùng" },
  { to: "/admin/account-settings", label: "Cấu hình đăng ký", icon: NAV_ICON.sliders, group: "Người dùng" },
  { to: "/admin/attempts", label: "Lịch sử làm bài", icon: NAV_ICON.attempts, group: "Người dùng" },
  { to: "/admin/badges", label: "Huy hiệu", icon: NAV_ICON.badges, group: "Người dùng" },
  { to: "/admin/deposits", label: "Lệnh nạp tiền", icon: NAV_ICON.deposit, group: "Tài chính" },
  { to: "/admin/bank-transactions", label: "Giao dịch ngân hàng", icon: NAV_ICON.bank, group: "Tài chính" },
  { to: "/admin/wallet", label: "Biến động số dư", icon: NAV_ICON.transactions, group: "Tài chính" },
  { to: "/admin/purchases", label: "Lịch sử mua", icon: NAV_ICON.bag, group: "Tài chính" },
  { to: "/admin/gift-codes", label: "Giftcode", icon: NAV_ICON.giftcode, group: "Tài chính" },
  { to: "/admin/sepay", label: "Cấu hình SePay", icon: NAV_ICON.settings, group: "Tài chính" },
  { to: "/admin/exams", label: "Đề thi", icon: NAV_ICON.exam, group: "Kho đề" },
  { to: "/admin/exam-upload", label: "Tải đề lên", icon: NAV_ICON.upload, group: "Kho đề" },
  { to: "/admin/exam-gaps", label: "Đề cần bổ sung", icon: NAV_ICON.searchDoc, group: "Kho đề" },
  { to: "/admin/contributions", label: "Đề đóng góp", icon: NAV_ICON.contribute, group: "Kho đề" },
  { to: "/admin/subjects", label: "Quản lý môn học", icon: NAV_ICON.library, group: "Kho đề" },
  { to: "/admin/crawl-jobs", label: "Lịch sử lấy đề", icon: NAV_ICON.history, group: "Kho đề" },
  { to: "/admin/reports", label: "Báo cáo đáp án", icon: NAV_ICON.report, group: "Chất lượng & AI" },
  { to: "/admin/explanation-feedback", label: "Đánh giá lời giải AI", icon: NAV_ICON.thumb, group: "Chất lượng & AI" },
  { to: "/admin/exam-comments", label: "Bình luận đề", icon: NAV_ICON.chat, group: "Chất lượng & AI" },
  { to: "/admin/quality", label: "Chất lượng đề", icon: NAV_ICON.quality, group: "Chất lượng & AI" },
  { to: "/admin/ai", label: "AI giải đáp án", icon: NAV_ICON.bot, group: "Chất lượng & AI" },
  { to: "/admin/chatbot", label: "Chatbot hỗ trợ", icon: NAV_ICON.chat, group: "Chất lượng & AI" },
  { to: "/admin/funnel", label: "Phễu người dùng", icon: NAV_ICON.funnel, group: "Tăng trưởng" },
  { to: "/admin/promotions", label: "Ưu đãi & khuyến mãi", icon: NAV_ICON.megaphone, group: "Tăng trưởng" },
  { to: "/admin/marketing", label: "Email marketing", icon: NAV_ICON.mail, group: "Tăng trưởng" },
  { to: "/admin/system-notices", label: "Gửi thông báo", icon: NAV_ICON.bell, group: "Tăng trưởng" },
  { to: "/admin/season", label: "Giao diện mùa", icon: NAV_ICON.sliders, group: "Tăng trưởng" },
  { to: "/admin/link-rewards", label: "Vượt link", icon: NAV_ICON.link, group: "Tăng trưởng" },
  { to: "/admin/coursera", label: "Coursera", icon: NAV_ICON.coursera, group: "Tăng trưởng" },
];

// Các route con của /admin
export const adminRoutes = (
  <>
    <Route index element={<DashboardPage />} />
    <Route path="coursera" element={<AdminCourseraPage />} />
    <Route path="users" element={<UsersPage />} />
    <Route path="users/:id" element={<UserDetailPage />} />
    <Route path="purchases" element={<PurchasesPage />} />
    <Route path="online" element={<OnlinePage />} />
    <Route path="referrals" element={<ReferralsPage />} />
    <Route path="account-settings" element={<AccountSettingsPage />} />
    <Route path="link-rewards" element={<LinkRewardSettingsPage />} />
    <Route path="notifications" element={<NoticesPage />} />
    <Route path="system-notices" element={<SystemNoticePage />} />
    <Route path="subjects" element={<SubjectsManagerPage />} />
    <Route path="promotions" element={<PromoSettingsPage />} />
    <Route path="marketing" element={<MarketingPage />} />
    <Route path="season" element={<SeasonPage />} />
    <Route path="wallet" element={<WalletHistoryPage />} />
    <Route path="crawl-jobs" element={<CrawlJobsPage />} />
    <Route path="attempts" element={<AttemptsPage />} />
    <Route path="badges" element={<AdminBadgesPage />} />
    <Route path="deposits" element={<DepositsPage />} />
    <Route path="bank-transactions" element={<BankTransactionsPage />} />
    <Route path="gift-codes" element={<GiftCodesPage />} />
    <Route path="sepay" element={<SepayPage />} />
    <Route path="exams" element={<ExamsPage />} />
    <Route path="exams/:id" element={<ExamEditPage />} />
    <Route path="exam-upload" element={<ExamUploadPage />} />
    <Route path="exam-gaps" element={<ExamGapsPage />} />
    <Route path="reports" element={<ReportsPage />} />
    <Route path="explanation-feedback" element={<FeedbackPage />} />
    <Route path="contributions" element={<AdminContributionsPage />} />
    <Route path="exam-comments" element={<AdminExamCommentsPage />} />
    <Route path="ai" element={<AiPage />} />
    <Route path="chatbot" element={<ChatbotPage />} />
    <Route path="funnel" element={<FunnelPage />} />
    <Route path="quality" element={<QualityPage />} />
    {/* Địa chỉ cũ */}
    <Route path="settings" element={<Navigate to="/admin/sepay" replace />} />
    <Route path="crawler" element={<Navigate to="/admin/crawl-jobs" replace />} />
    <Route path="fuo-sources" element={<Navigate to="/admin/exam-upload" replace />} />
  </>
);
