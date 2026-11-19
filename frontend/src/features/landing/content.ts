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

// Popup thông báo khi vào trang chủ (có hạn thật: hết hạn đăng ký thì tự ẩn, không cần sửa code)
export const LANDING_NOTICE = {
  image: "/promo/fcode-arcode.jpg",
  imageAlt: "Poster tuyển thành viên của CLB F-Code",
  badge: "Cơ hội cho sinh viên FPTU",
  title: "CLB F-Code đang mở đơn tuyển thành viên",
  lead: "F-Code là câu lạc bộ học thuật đầu tiên của ĐH FPT TP.HCM, hơn 11 năm kể từ ngày thành lập 28/08/2014. Ở đây có 5 crew để bạn chọn: FE, BE, AI, DevOps và Game. Tụi mình không cần bạn giỏi sẵn, chỉ cần bạn chịu khó học hỏi. Còn lại cứ để anh chị chỉ cho!",
  perks: ["Tham quan doanh nghiệp", "Được anh chị kèm cặp", "Làm dự án thật, không phải bài tập", "Có thêm một đám bạn cùng chí hướng"],
  goodNews: "Cả hệ thống FEPass.top mà bạn đang dùng đây là do thành viên F-Code trực tiếp vận hành. Vào CLB là bạn được ngồi cùng làm ra sản phẩm có người dùng thật.",
  rounds: [
    { name: "Vòng 1: Nộp đơn", when: "Đăng ký từ 12 – 22/11" },
    { name: "Vòng 2: Gặp nhau trò chuyện", when: "Phỏng vấn từ 01 – 09/12" },
    { name: "Vòng 3: Thử sức", when: "Làm bài thử thách từ 14 – 24/12" },
  ],
  note: "Đăng ký đến hết 22/11, đừng để lỡ nhé!",
  link: "https://www.facebook.com/fcodeclub",
  linkLabel: "Xem chi tiết & đăng ký",
  endsAt: "2026-11-23T00:00:00+07:00",
};
