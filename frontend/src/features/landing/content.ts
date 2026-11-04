import { BarChart3, History, Sparkles } from "lucide-react";
import { brand } from "@/shared/brand/brand";

// Nội dung văn bản của trang chủ, tách khỏi giao diện để dễ sửa lời

// Ba ý ngắn dưới vùng thả thư mục
export const FEATURES = [
  { icon: Sparkles, text: "Giải thích bằng AI" },
  { icon: BarChart3, text: "Chấm điểm thang 10" },
  { icon: History, text: "Lưu lịch sử làm bài" },
];

export const STEPS = [
  { title: "Lấy đề", text: "Dán link đề FuOverflow để hệ thống tự lấy về, hoặc kéo thả thư mục ảnh đề của bạn." },
  { title: "Làm bài", text: "Luyện tập xem đúng sai từng câu, hoặc thi thử rồi mới chấm." },
  { title: "Nhận điểm thang 10", text: "Điểm tính tự động, kèm thời gian làm bài và câu còn bỏ trống." },
];

export const FOLDER_EXAMPLE = [
  "ten-de/",
  "├─ 1.webp      câu 1",
  "├─ 2.webp      câu 2",
  "└─ ans.txt     dòng N = đáp án câu N",
  "               (nhiều đáp án: A C D)",
].join("\n");

// Tách slogan thành phần thường + phần nhấn (cụm cuối được tô xanh), ví dụ "Hành trình đi đến" + "điểm 10."
export function splitSlogan(slogan: string) {
  const m = slogan.match(/^(.*?)(điểm\s*\d+\.?)$/i);
  return m ? [m[1] ?? "", m[2] ?? ""] : [slogan, ""];
}
