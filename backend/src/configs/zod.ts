import { z } from "zod";

// Lời nhắn tiếng Việt mặc định cho mọi schema zod không tự đặt message (schema tự đặt thì luôn thắng).
// Nạp một lần lúc khởi động qua error.middlewares.ts (app.ts nạp file đó). Tên trường lấy từ path; trường không có trong bảng thì gọi là "thông tin này".
const FIELD_LABELS: Record<string, string> = {
  email: "email",
  password: "mật khẩu",
  currentPassword: "mật khẩu hiện tại",
  newPassword: "mật khẩu mới",
  fullName: "họ tên",
  name: "tên",
  title: "tiêu đề",
  content: "nội dung",
  message: "tin nhắn",
  messages: "tin nhắn",
  note: "ghi chú",
  adminNote: "ghi chú",
  comment: "góp ý",
  reason: "lý do",
  url: "liên kết",
  code: "mã",
  referralCode: "mã giới thiệu",
  amount: "số tiền",
  price: "giá",
  subject: "mã môn",
  subjectCode: "mã môn",
  examId: "đề",
  questionNumber: "số câu",
  token: "liên kết",
  captchaToken: "mã xác minh captcha",
  page: "số trang",
  limit: "số mục mỗi trang",
  q: "từ khoá tìm kiếm",
  mode: "chế độ làm bài",
  status: "trạng thái",
  file: "tệp",
};

const labelOf = (path: PropertyKey[] | undefined) => {
  const key = [...(path ?? [])].reverse().find((p): p is string => typeof p === "string");
  return (key && FIELD_LABELS[key]) || "thông tin này";
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const viZodError: z.core.$ZodErrorMap = (issue) => {
  const label = labelOf(issue.path);
  const Label = cap(label);
  switch (issue.code) {
    case "invalid_type":
      if (issue.input === undefined || issue.input === null) return `Vui lòng nhập ${label}`;
      if (issue.expected === "int") return `${Label} phải là số nguyên`;
      if (issue.expected === "number") return `${Label} phải là số`;
      if (issue.expected === "array") return `${Label} phải là một danh sách`;
      return `${Label} không đúng định dạng`;
    case "too_small": {
      const n = Number(issue.minimum);
      if (issue.origin === "string") return n <= 1 ? `Vui lòng nhập ${label}` : `${Label} cần ít nhất ${n} ký tự`;
      if (issue.origin === "array" || issue.origin === "set") return n <= 1 ? `Vui lòng chọn ít nhất một ${label}` : `${Label} cần ít nhất ${n} mục`;
      return issue.inclusive ? `${Label} phải từ ${n} trở lên` : `${Label} phải lớn hơn ${n}`;
    }
    case "too_big": {
      const n = Number(issue.maximum);
      if (issue.origin === "string") return `${Label} tối đa ${n} ký tự, hãy rút gọn lại`;
      if (issue.origin === "array" || issue.origin === "set") return `${Label} tối đa ${n} mục`;
      if (issue.origin === "file") return "Tệp quá lớn, hãy chọn tệp nhỏ hơn";
      return issue.inclusive ? `${Label} tối đa là ${n}` : `${Label} phải nhỏ hơn ${n}`;
    }
    case "invalid_format":
      if (issue.format === "email") return "Email không đúng định dạng, ví dụ: ten@gmail.com";
      if (issue.format === "url") return `${Label} phải là một đường link hợp lệ, bắt đầu bằng https://`;
      if (issue.format === "datetime" || issue.format === "date") return `${Label} không phải ngày giờ hợp lệ`;
      return `${Label} không đúng định dạng`;
    case "invalid_value":
      return `${Label} không nằm trong các lựa chọn cho phép, vui lòng chọn lại`;
    case "unrecognized_keys":
      return "Dữ liệu gửi lên có trường không được hỗ trợ. Vui lòng tải lại trang rồi thử lại";
    default:
      return `${Label} không hợp lệ`;
  }
};

z.config({ customError: viZodError });
