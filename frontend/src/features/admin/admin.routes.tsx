import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
import { MessagesSquare, ShoppingBag, Megaphone, Bot, ClipboardList, DatabaseZap, FileText, History, SlidersHorizontal, Wallet, Gift, MessageSquareWarning, UserPlus, Landmark, LayoutDashboard, Receipt, Settings, Users } from "lucide-react";
import type { NavItem } from "@/shared/layout/PanelLayout";

/**
 * Trang quản trị chia theo module, mỗi module một thư mục trong features/admin:
 *   overview/  Tổng quan
 *   users/     Thành viên, giới thiệu
 *   finance/   Lệnh nạp, giao dịch ngân hàng, giftcode, cấu hình SePay
 *   content/   Đề thi, báo cáo đáp án, cấu hình lấy đề, AI giải đáp án
 * Menu và đường dẫn khai báo ở đây, thêm trang mới chỉ cần sửa file này.
 */
const DashboardPage = lazy(() => import("./overview/DashboardPage"));
const UsersPage = lazy(() => import("./users/UsersPage"));
const UserDetailPage = lazy(() => import("./users/UserDetailPage"));
const PurchasesPage = lazy(() => import("./users/PurchasesPage"));
const WalletHistoryPage = lazy(() => import("./users/WalletHistoryPage"));
const CrawlJobsPage = lazy(() => import("./users/CrawlJobsPage"));
const AttemptsPage = lazy(() => import("./users/AttemptsPage"));
const AccountSettingsPage = lazy(() => import("./users/AccountSettingsPage"));
const PromoSettingsPage = lazy(() => import("./users/PromoSettingsPage"));
const DepositsPage = lazy(() => import("./finance/DepositsPage"));
const BankTransactionsPage = lazy(() => import("./finance/BankTransactionsPage"));
const ReferralsPage = lazy(() => import("./users/ReferralsPage"));
const GiftCodesPage = lazy(() => import("./finance/GiftCodesPage"));
const SepayPage = lazy(() => import("./finance/SepayPage"));
const ExamsPage = lazy(() => import("./content/ExamsPage"));
const ExamEditPage = lazy(() => import("./content/ExamEditPage"));
const CrawlerPage = lazy(() => import("./content/CrawlerPage"));
const ReportsPage = lazy(() => import("./content/ReportsPage"));
const ChatbotPage = lazy(() => import("./content/ChatbotPage"));
const AiPage = lazy(() => import("./content/AiPage"));

export const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Tổng quan", icon: LayoutDashboard, end: true, group: "Chung" },
  { to: "/admin/users", label: "Thành viên", icon: Users, group: "Người dùng" },
  { to: "/admin/referrals", label: "Giới thiệu", icon: UserPlus, group: "Người dùng" },
  { to: "/admin/account-settings", label: "Cấu hình đăng ký", icon: SlidersHorizontal, group: "Người dùng" },
  { to: "/admin/promotions", label: "Ưu đãi & khuyến mãi", icon: Megaphone, group: "Người dùng" },
  { to: "/admin/wallet", label: "Biến động số dư", icon: Wallet, group: "Lịch sử" },
  { to: "/admin/crawl-jobs", label: "Lịch sử lấy đề", icon: History, group: "Lịch sử" },
  { to: "/admin/attempts", label: "Lịch sử làm bài", icon: ClipboardList, group: "Lịch sử" },
  { to: "/admin/purchases", label: "Lịch sử mua", icon: ShoppingBag, group: "Lịch sử" },
  { to: "/admin/deposits", label: "Lệnh nạp tiền", icon: Receipt, group: "Tài chính" },
  { to: "/admin/bank-transactions", label: "Giao dịch ngân hàng", icon: Landmark, group: "Tài chính" },
  { to: "/admin/gift-codes", label: "Giftcode", icon: Gift, group: "Tài chính" },
  { to: "/admin/sepay", label: "Cấu hình SePay", icon: Settings, group: "Tài chính" },
  { to: "/admin/exams", label: "Đề thi", icon: FileText, group: "Nội dung & AI" },
  { to: "/admin/reports", label: "Báo cáo đáp án", icon: MessageSquareWarning, group: "Nội dung & AI" },
  { to: "/admin/crawler", label: "Cấu hình lấy đề", icon: DatabaseZap, group: "Nội dung & AI" },
  { to: "/admin/ai", label: "AI giải đáp án", icon: Bot, group: "Nội dung & AI" },
  { to: "/admin/chatbot", label: "Chatbot hỗ trợ", icon: MessagesSquare, group: "Nội dung & AI" },
];

// Các route con của /admin
export const adminRoutes = (
  <>
    <Route index element={<DashboardPage />} />
    <Route path="users" element={<UsersPage />} />
    <Route path="users/:id" element={<UserDetailPage />} />
    <Route path="purchases" element={<PurchasesPage />} />
    <Route path="referrals" element={<ReferralsPage />} />
    <Route path="account-settings" element={<AccountSettingsPage />} />
    <Route path="promotions" element={<PromoSettingsPage />} />
    <Route path="wallet" element={<WalletHistoryPage />} />
    <Route path="crawl-jobs" element={<CrawlJobsPage />} />
    <Route path="attempts" element={<AttemptsPage />} />
    <Route path="deposits" element={<DepositsPage />} />
    <Route path="bank-transactions" element={<BankTransactionsPage />} />
    <Route path="gift-codes" element={<GiftCodesPage />} />
    <Route path="sepay" element={<SepayPage />} />
    <Route path="exams" element={<ExamsPage />} />
    <Route path="exams/:id" element={<ExamEditPage />} />
    <Route path="reports" element={<ReportsPage />} />
    <Route path="crawler" element={<CrawlerPage />} />
    <Route path="ai" element={<AiPage />} />
    <Route path="chatbot" element={<ChatbotPage />} />
    {/* Địa chỉ cũ */}
    <Route path="settings" element={<Navigate to="/admin/sepay" replace />} />
  </>
);
