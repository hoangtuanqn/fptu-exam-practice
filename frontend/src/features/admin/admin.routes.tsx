import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
import { BellRing, BookMarked, Link2, MailPlus, Activity, ShieldCheck as QualityIcon, MessagesSquare, ShoppingBag, Megaphone, Bot, ClipboardList, DatabaseZap, ListPlus, FileText, FileUp, FolderSearch, History, SlidersHorizontal, Wallet, Gift, ImageUp, MessageSquareWarning, UserPlus, Landmark, LayoutDashboard, Receipt, Settings, ThumbsUp, Users } from "lucide-react";
import type { NavItem } from "@/shared/layout/PanelLayout";

/**
 * Trang quản trị chia theo module, mỗi module một thư mục trong features/admin:
 *   overview/  Tổng quan
 *   users/     Thành viên, giới thiệu
 *   finance/   Lệnh nạp, giao dịch ngân hàng, giftcode, cấu hình SePay
 *   content/   Đề thi, báo cáo đáp án, cấu hình lấy đề, AI giải đáp án
 * Menu và đường dẫn khai báo ở đây, thêm trang mới chỉ cần sửa file này.
 */
const AdminCourseraPage = lazy(() => import("@/features/coursera/AdminCourseraPage"));
const AdminContributionsPage = lazy(() => import("@/features/exam-contribution/AdminContributionsPage"));
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
const CrawlerPage = lazy(() => import("./content/CrawlerPage"));
const FuoSourcesPage = lazy(() => import("./fuo-sources/FuoSourcesPage"));
const ReportsPage = lazy(() => import("./content/ReportsPage"));
const FeedbackPage = lazy(() => import("./content/FeedbackPage"));
const ChatbotPage = lazy(() => import("./content/ChatbotPage"));
const AiPage = lazy(() => import("./content/AiPage"));
const SubjectsManagerPage = lazy(() => import("./content/SubjectsManagerPage"));
const NoticesPage = lazy(() => import("./notices/NoticesPage"));
const SystemNoticePage = lazy(() => import("./notices/SystemNoticePage"));
const FunnelPage = lazy(() => import("./insights/FunnelPage"));
const QualityPage = lazy(() => import("./insights/QualityPage"));
const MarketingPage = lazy(() => import("./marketing/MarketingPage"));

export const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Tổng quan", icon: LayoutDashboard, end: true, group: "Chung" },
  { to: "/admin/users", label: "Thành viên", icon: Users, group: "Người dùng" },
  { to: "/admin/referrals", label: "Giới thiệu", icon: UserPlus, group: "Người dùng" },
  { to: "/admin/account-settings", label: "Cấu hình đăng ký", icon: SlidersHorizontal, group: "Người dùng" },
  { to: "/admin/attempts", label: "Lịch sử làm bài", icon: ClipboardList, group: "Người dùng" },
  { to: "/admin/deposits", label: "Lệnh nạp tiền", icon: Receipt, group: "Tài chính" },
  { to: "/admin/bank-transactions", label: "Giao dịch ngân hàng", icon: Landmark, group: "Tài chính" },
  { to: "/admin/wallet", label: "Biến động số dư", icon: Wallet, group: "Tài chính" },
  { to: "/admin/purchases", label: "Lịch sử mua", icon: ShoppingBag, group: "Tài chính" },
  { to: "/admin/gift-codes", label: "Giftcode", icon: Gift, group: "Tài chính" },
  { to: "/admin/sepay", label: "Cấu hình SePay", icon: Settings, group: "Tài chính" },
  { to: "/admin/exams", label: "Đề thi", icon: FileText, group: "Kho đề" },
  { to: "/admin/exam-upload", label: "Tải đề lên", icon: FileUp, group: "Kho đề" },
  { to: "/admin/exam-gaps", label: "Đề cần bổ sung", icon: FolderSearch, group: "Kho đề" },
  { to: "/admin/contributions", label: "Đề đóng góp", icon: ImageUp, group: "Kho đề" },
  { to: "/admin/subjects", label: "Quản lý môn học", icon: BookMarked, group: "Kho đề" },
  { to: "/admin/fuo-sources", label: "Nguồn đề", icon: ListPlus, group: "Kho đề" },
  { to: "/admin/crawler", label: "Cấu hình lấy đề", icon: DatabaseZap, group: "Kho đề" },
  { to: "/admin/crawl-jobs", label: "Lịch sử lấy đề", icon: History, group: "Kho đề" },
  { to: "/admin/reports", label: "Báo cáo đáp án", icon: MessageSquareWarning, group: "Chất lượng & AI" },
  { to: "/admin/explanation-feedback", label: "Đánh giá lời giải AI", icon: ThumbsUp, group: "Chất lượng & AI" },
  { to: "/admin/quality", label: "Chất lượng đề", icon: QualityIcon, group: "Chất lượng & AI" },
  { to: "/admin/ai", label: "AI giải đáp án", icon: Bot, group: "Chất lượng & AI" },
  { to: "/admin/chatbot", label: "Chatbot hỗ trợ", icon: MessagesSquare, group: "Chất lượng & AI" },
  { to: "/admin/funnel", label: "Phễu người dùng", icon: Activity, group: "Tăng trưởng" },
  { to: "/admin/promotions", label: "Ưu đãi & khuyến mãi", icon: Megaphone, group: "Tăng trưởng" },
  { to: "/admin/marketing", label: "Email marketing", icon: MailPlus, group: "Tăng trưởng" },
  { to: "/admin/system-notices", label: "Gửi thông báo", icon: BellRing, group: "Tăng trưởng" },
  { to: "/admin/link-rewards", label: "Vượt link", icon: Link2, group: "Tăng trưởng" },
  { to: "/admin/coursera", label: "Coursera", icon: ShoppingBag, group: "Tăng trưởng" },
];

// Các route con của /admin
export const adminRoutes = (
  <>
    <Route index element={<DashboardPage />} />
    <Route path="coursera" element={<AdminCourseraPage />} />
    <Route path="users" element={<UsersPage />} />
    <Route path="users/:id" element={<UserDetailPage />} />
    <Route path="purchases" element={<PurchasesPage />} />
    <Route path="referrals" element={<ReferralsPage />} />
    <Route path="account-settings" element={<AccountSettingsPage />} />
    <Route path="link-rewards" element={<LinkRewardSettingsPage />} />
    <Route path="notifications" element={<NoticesPage />} />
    <Route path="system-notices" element={<SystemNoticePage />} />
    <Route path="subjects" element={<SubjectsManagerPage />} />
    <Route path="promotions" element={<PromoSettingsPage />} />
    <Route path="marketing" element={<MarketingPage />} />
    <Route path="wallet" element={<WalletHistoryPage />} />
    <Route path="crawl-jobs" element={<CrawlJobsPage />} />
    <Route path="attempts" element={<AttemptsPage />} />
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
    <Route path="crawler" element={<CrawlerPage />} />
    <Route path="fuo-sources" element={<FuoSourcesPage />} />
    <Route path="ai" element={<AiPage />} />
    <Route path="chatbot" element={<ChatbotPage />} />
    <Route path="funnel" element={<FunnelPage />} />
    <Route path="quality" element={<QualityPage />} />
    {/* Địa chỉ cũ */}
    <Route path="settings" element={<Navigate to="/admin/sepay" replace />} />
  </>
);
