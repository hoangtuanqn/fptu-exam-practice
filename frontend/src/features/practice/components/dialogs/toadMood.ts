// Cóc Pass phản ứng theo điểm số: 8 mức, từ choáng váng (0 điểm) đến ăn mừng (10 điểm). Điểm đạt là 5 (PASS_SCORE).
export type ToadMood = "zero" | "cry" | "worry" | "ok" | "good" | "happy" | "star" | "perfect";

export interface ToadLine {
  mood: ToadMood;
  board: string; // chữ trên bảng cóc cầm (ngắn)
  say: string; // lời cóc nói dưới điểm
}

export function toadFor(score: number): ToadLine {
  if (score <= 0) return { mood: "zero", board: "0 ĐIỂM", say: "Ối, 0 điểm! Không sao, ai cũng có lúc trượt chân. Xem đáp án rồi làm lại, chắc chắn lên." };
  if (score < 3) return { mood: "cry", board: "CỐ LÊN", say: "Đừng buồn nhé, ai cũng có lần vấp. Xem lại câu sai rồi làm lại là lên ngay!" };
  if (score < 5) return { mood: "worry", board: "GẦN RỒI", say: "Gần đạt rồi! Ôn lại vài chủ đề yếu là qua." };
  if (score < 6.5) return { mood: "ok", board: "ĐẠT RỒI", say: "Đạt rồi, làm tốt lắm! Thêm chút nữa là điểm cao." };
  if (score < 8) return { mood: "good", board: "KHÁ TỐT", say: "Khá tốt đó! Sửa vài câu sai nữa là lên điểm giỏi." };
  if (score < 9.5) return { mood: "happy", board: "GIỎI QUÁ", say: "Điểm cao quá, giỏi lắm! Cóc Pass vỗ tay cho bạn." };
  if (score < 10) return { mood: "star", board: "XUẤT SẮC", say: "Xuất sắc! Chỉ cách điểm tuyệt đối một chút xíu thôi." };
  return { mood: "perfect", board: "TUYỆT ĐỐI", say: "10 điểm tuyệt đối! Cóc Pass phong bạn làm Cóc Vàng của kỳ thi." };
}
