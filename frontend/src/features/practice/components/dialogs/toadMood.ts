// Cóc Pass phản ứng theo điểm số: 8 mức, từ choáng váng (0 điểm) đến ăn mừng (10 điểm). Điểm đạt là 5 (PASS_SCORE).
export type ToadMood = "zero" | "cry" | "worry" | "ok" | "good" | "happy" | "star" | "perfect";

export interface ToadLine {
  mood: ToadMood;
  say: string; // lời cóc nói dưới điểm
}

export function toadFor(score: number): ToadLine {
  if (score <= 0) return { mood: "zero", say: "Ối, 0 điểm! Cóc ôm bạn một cái nè. Ai cũng có lúc trượt chân, mình xem lại đáp án rồi làm lại nhé." };
  if (score < 3) return { mood: "cry", say: "Cóc biết bạn đang buồn... nhưng đừng nản, mình sửa mấy câu sai là lên ngay thôi!" };
  if (score < 5) return { mood: "worry", say: "Hơi tiếc nhỉ, gần đạt rồi! Ôn lại vài chủ đề yếu là qua." };
  if (score < 6.5) return { mood: "ok", say: "Đạt rồi, làm tốt lắm! Thêm chút nữa là điểm cao." };
  if (score < 8) return { mood: "good", say: "Khá tốt đó! Sửa vài câu sai nữa là lên điểm giỏi." };
  if (score < 9.5) return { mood: "happy", say: "Điểm cao quá, giỏi lắm! Cóc Pass vỗ tay cho bạn." };
  if (score < 10) return { mood: "star", say: "Xuất sắc! Chỉ cách điểm tuyệt đối một chút xíu thôi." };
  return { mood: "perfect", say: "10 điểm tuyệt đối! Cóc Pass phong bạn làm Cóc Vàng của kỳ thi." };
}
