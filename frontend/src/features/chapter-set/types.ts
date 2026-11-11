// Một đề đã được chọn cho bộ đề theo chương (từ kho của tôi hoặc vừa nhập từ link FuOverflow)
export interface PickedExam {
  id: number;
  threadId: string;
  title: string;
  totalQuestions: number;
}
