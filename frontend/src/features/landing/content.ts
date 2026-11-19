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
  badge: "Tin vui cho dân FPTU",
  title: "CLB F-Code đang tuyển thành viên, vào chơi thôi!",
  lead: "F-Code là câu lạc bộ học thuật đầu tiên của ĐH FPT TP.HCM, thành lập từ 28/08/2014, với 5 team chuyên môn: FE, BE, AI, DevOps và Game. Không cần giỏi sẵn: F-Code tìm những bạn chịu khó học hỏi, kỹ thuật cứ từ từ rồi sẽ tới. Tham gia cùng tụi mình nhé!",
  perks: ["Tham quan doanh nghiệp", "Học hỏi từ các anh chị đi trước", "Làm dự án thực tế", "Kết bạn, vui như một gia đình"],
  goodNews: "Thành viên F-Code là những người trực tiếp vận hành FEPass.top. Vào CLB là bạn được làm ra sản phẩm có người dùng thật mỗi ngày.",
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
