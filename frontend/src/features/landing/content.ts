import { brand } from "@/shared/brand/brand";

// Nội dung văn bản của trang chủ, tách khỏi giao diện để dễ sửa lời

export const STEPS = [
  { title: "Chọn đề", text: "Chọn môn rồi mở đề có sẵn." },
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

// Thông báo đầu trang chủ (có hạn thật: hết hạn đăng ký thì tự ẩn, không cần sửa code)
export const LANDING_NOTICE = {
  text: "CLB F-Code đang tuyển thành viên ARCODE: cần bạn chịu khó học hỏi, không đặt nặng kỹ thuật. Đăng ký đến hết 22/11.",
  link: "https://www.facebook.com/fcodeclub",
  linkLabel: "Xem chi tiết",
  endsAt: "2026-11-23T00:00:00+07:00",
};
