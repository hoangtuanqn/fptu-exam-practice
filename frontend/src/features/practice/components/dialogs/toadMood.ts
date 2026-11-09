// Cóc Pass phản ứng theo điểm số: 5 mức, từ buồn đến ăn mừng. Điểm đạt là 5 (PASS_SCORE).
export type ToadMood = "cry" | "worry" | "ok" | "happy" | "star";

export interface ToadLine {
  mood: ToadMood;
  board: string; // chữ trên bảng cóc cầm (ngắn)
  say: string; // lời cóc nói dưới điểm
}

export function toadFor(score: number): ToadLine {
  if (score < 3) return { mood: "cry", board: "CỐ LÊN", say: "Đừng buồn nhé, ai cũng có lần vấp. Xem lại câu sai rồi làm lại là lên ngay!" };
  if (score < 5) return { mood: "worry", board: "GẦN RỒI", say: "Gần đạt rồi! Ôn lại vài chủ đề yếu là qua." };
  if (score < 7) return { mood: "ok", board: "ĐẠT RỒI", say: "Đạt rồi, làm tốt lắm! Thêm chút nữa là điểm cao." };
  if (score < 9) return { mood: "happy", board: "GIỎI QUÁ", say: "Điểm cao quá, giỏi lắm! Cóc Pass vỗ tay cho bạn." };
  return { mood: "star", board: "XUẤT SẮC", say: "Xuất sắc! Cóc Pass tự hào về bạn." };
}
