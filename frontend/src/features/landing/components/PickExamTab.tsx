import { useAuth } from "@/features/auth/AuthContext";
import { catalogApi } from "@/features/exam-store/catalog.api";
import { PublicSubjectBrowser } from "@/features/exam-store/PublicSubjectBrowser";
import { SubjectBrowser } from "@/features/exam-store/SubjectBrowser";
import { useApi } from "@/shared/hooks/useApi";

// Tab "Chọn đề" ở trang chủ: chọn môn rồi mở đề, cho người chưa biết FuOverflow là gì.
// Thành viên dùng đúng Kho đề trong tài khoản (có báo phí trước khi lấy); khách xem danh sách và được dẫn đi đăng ký khi mở đề.
export function PickExamTab() {
  const { user, loading } = useAuth();
  if (loading) return null; // chờ biết đã đăng nhập hay chưa, tránh nháy từ bản khách sang bản thành viên
  return user ? <SubjectBrowser compact /> : <GuestPick />;
}

function GuestPick() {
  const subjects = useApi(() => catalogApi.subjects(), []);
  return <PublicSubjectBrowser subjects={subjects} compact />;
}
