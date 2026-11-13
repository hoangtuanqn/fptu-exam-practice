// Tìm kiếm nội dung Syllabus cho chatbot (RAG nhiều đường): embedding + BM25 + lọc theo môn + ưu tiên theo ý định câu hỏi,
// rồi đổi các tín hiệu đó thành xác suất "đoạn này trả lời được câu hỏi". Các hệ số do scripts/eval-rag.ts học từ bộ câu hỏi mẫu.

/** Phần của một môn (cột `kind` của subject_chunks) */
export type SyllabusKind = "overview" | "tasks" | "materials" | "clo" | "chapters" | "sessions" | "cq" | "assessment";

export const KIND_LABEL: Record<SyllabusKind, string> = {
  overview: "Tổng quan môn học",
  tasks: "Nhiệm vụ của sinh viên",
  materials: "Tài liệu học tập",
  clo: "Chuẩn đầu ra (CLO)",
  chapters: "Các chương và mục",
  sessions: "Lịch học từng buổi",
  cq: "Câu hỏi gợi ý",
  assessment: "Cách đánh giá",
};

// Ý định của câu hỏi (đã bỏ dấu, viết thường) -> phần của syllabus nhiều khả năng chứa câu trả lời. Chỉ là ưu tiên cộng thêm, không loại đoạn nào.
export const KIND_INTENT: [SyllabusKind, RegExp][] = [
  ["assessment", /(cham diem|tinh diem|danh gia|trong so|qua mon|dau mon|rot mon|thi cuoi|assessment|bai kiem tra|hinh thuc thi|cach tinh diem|diem so|diem thanh phan|thi cu|kiem tra|bai thi|progress test|final exam|bai nao)/],
  ["materials", /(giao trinh|sach|cuon nao|quyen|tai lieu|textbook|material|isbn|tac gia|nha xuat ban|doc gi)/],
  ["clo", /(chuan dau ra|\bclo\b|\bclo\d|muc tieu hoc tap|learning outcome|hoc xong|dat duoc|lam duoc|ket qua hoc tap|ky nang)/],
  ["chapters", /(chuong|noi dung|hoc gi|bai hoc|chu de|muc luc|hoc ve|phan nao|bai thu|hoc tiep|gom nhung|chuong dau)/],
  ["sessions", /(buoi hoc|buoi \d|lich hoc|\bslot\b|tuan \d|session|tien do)/],
  ["cq", /(cau hoi goi y|\bcq\d|cau hoi on tap)/],
  ["overview", /(mo ta|gioi thieu|tin chi|\bchi\b|tien quyet|thoi luong|phuong phap|bao nhieu tin|mon hoc la gi|la mon gi|day gi|ke so|hoc phan)/],
  ["tasks", /(nhiem vu|sinh vien phai|diem danh|chuyen can|nop bai|cong cu|yeu cau cua mon|chuan bi|bat buoc|di hoc)/],
];

// Phần ưu tiên khi câu hỏi không nêu phần nào của syllabus
export const RAG_DEFAULT_KINDS: SyllabusKind[] = ["overview", "assessment", "chapters"];

// Câu hỏi có vẻ hỏi về syllabus (kể cả khi không nêu mã môn): bật đường tìm kiếm này. Không khớp thì bỏ qua cho đỡ tốn.
export const SYLLABUS_WORDS = /(\bmon\b|syllabus|de cuong|hoc phan|tin chi|\bclo\b|giao trinh|chuong trinh hoc|trong so|buoi hoc|lich hoc|tien quyet|chuan dau ra)/;

export const RAG_POOL = 30; // mỗi đường tìm (embedding, BM25) lấy chừng này đoạn đầu
export const RAG_RRF_K = 60;
export const RAG_MIN_CHUNKS = 3; // khi đã nêu môn: luôn đưa ít nhất chừng này đoạn tốt nhất, kể cả xác suất thấp
export const RAG_MAX_CHUNKS = 5; // số đoạn tối đa đưa vào ngữ cảnh khi biết môn
export const RAG_MAX_CONTEXT_CHARS = 9000; // ~2,5 nghìn token
export const RAG_PER_CODE_MIN = 2; // câu hỏi nêu nhiều mã môn: mỗi mã luôn có ít nhất chừng này đoạn tốt nhất
export const RAG_PER_CODE_MAX = 4; // ... và tối đa chừng này đoạn
export const RAG_MULTI_MAX_CODES = 6; // chỉ xét chừng này mã môn đầu tiên trong một câu hỏi (quá thì bot dặn gửi phần còn lại ở tin nhắn mới)
export const RAG_MULTI_MAX_CONTEXT_CHARS = 20000; // ngân sách ký tự chung cho câu hỏi nhiều môn (~6 nghìn token)
export const RAG_CROSS_SUBJECTS = 5; // câu hỏi không nêu môn: liệt kê tối đa chừng này môn
export const RAG_SNIPPET_CHARS = 700; // mỗi môn trong danh sách chỉ lấy đoạn đầu của đoạn tốt nhất

/** Hệ số của mô hình xác suất: p = sigmoid(b + cos*dense + lex*lexical + kind*kindMatch). Một bộ cho mỗi chế độ và việc có/không có embedding. */
export interface RagWeights {
  b: number;
  dense: number;
  lex: number;
  kind: number;
  /** p tối thiểu để đưa đoạn vào ngữ cảnh */
  include: number;
  /** đoạn tốt nhất phải đạt mức này mới coi là "có câu trả lời"; thấp hơn thì chatbot nói chưa có thông tin */
  answer: number;
}

// Hệ số học bằng `npm run eval:rag` trên bộ câu hỏi mẫu (hồi quy logistic, đặc trưng đã chuẩn hoá); include/answer chọn theo bảng ngưỡng của lần đo đó.
// Đo trên phần kiểm tra: hỏi trong một môn đúng ở hạng 1 khoảng 92% (hạng 3: 99%); câu hỏi tự nhiên không chứa từ khoá ý định đạt khoảng 86% ở hạng 1.
export const RAG_WEIGHTS: Record<"subject" | "cross", { hybrid: RagWeights; lexical: RagWeights }> = {
  subject: {
    hybrid: { b: -4.5, dense: 4.21, lex: 2.3, kind: 1.5, include: 0.15, answer: 0.2 },
    lexical: { b: -2.53, dense: 0, lex: 2.73, kind: 1.5, include: 0.2, answer: 0.25 },
  },
  cross: {
    hybrid: { b: -7.81, dense: 10.59, lex: 4.6, kind: -0.91, include: 0.3, answer: 0.4 },
    lexical: { b: -2.7, dense: 0, lex: 5.81, kind: -0.65, include: 0.25, answer: 0.3 },
  },
};
