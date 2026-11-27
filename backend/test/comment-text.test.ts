import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EXAM_COMMENT_REPEAT_CHAR_MAX } from "../src/constants/exam-comment";
import { answerLettersOf, moderateComment } from "../src/utils/comment-text";

// Bộ lọc bình luận: câu bậy (kể cả lách luật) bị chặn/giữ, câu hợp lệ dễ bị chặn nhầm vẫn qua; nhận chữ đáp án ở đầu bình luận.

const expect = (verdict: ReturnType<typeof moderateComment>, samples: string[]) => {
  for (const s of samples) assert.equal(moderateComment(s), verdict, s);
};

describe("moderateComment", () => {
  it("does not let formatting hide words or links", () => {
    expect("BLOCKED", ["**đ**m", "đ~~~~m", "đ||m"]);
    expect("LINK", ["[xem](//evil.ru/x)", "[xem](ftp:abc)", "[xem](https\\://abc)", "[a]: //evil.ru", "<irc:abc>"]);
    expect("WORDS", ["&#273;m", "&uacute;"]);
    expect(null, ["**đậm** và *nghiêng*", "## Tiêu đề\n- một\n- hai", "dùng `arr[i](x)` nhé", "vector<std::string> v;", "a && b; x &y", "| A | B |\n| --- | --- |\n| 1 | 2 |", "[trang đề](/exam/1)"]);
  });

  it("blocks profanity and insults, with or without evasion", () => {
    expect("BLOCKED", [
      "đm câu này",
      "ĐM",
      "đmmmmm",
      "đ.m",
      "đ-m",
      "d_c_m",
      "v c l",
      "vcl thật",
      "câu này khó vãi lồn",
      "Fuck this",
      "fuuuuck",
      "f.u.c.k",
      "assshole",
      "óc chó à",
      "ngu như bò",
      "đi chết đi",
      "dit me may",
      "đ​m", // ký tự vô hình
      "đm".normalize("NFD"),
    ]);
  });

  it("holds ambiguous words, threats, cheating, ads, adult and political words", () => {
    expect("WORDS", ["dm", "vl luôn", "thằng ngu", "ngu vãi", "giết mày", "ai bán đề không", "thi hộ giá rẻ", "inbox mình", "ib mình nhé", "nhà cái uy tín", "phim sex", "phản động", "du ma"]);
  });

  it("holds links and personal contact details", () => {
    expect("LINK", ["xem https://abc.xyz", "www.google", "vào abc.com nhé", "web.com.vn", "tải ở drive.io"]);
    expect("CONTACT", ["zalo 0912345678", "gọi 0912 345 678", "0912.345.678", "+84 912 345 678", "84912345678", "mail a.b@gmail.com", "t.me/abc", "facebook.com/x", "fb.com/y", "add telegram"]);
  });

  it("holds a character repeated too many times", () => {
    assert.equal(moderateComment("a".repeat(EXAM_COMMENT_REPEAT_CHAR_MAX + 1)), "REPEATED");
    assert.equal(moderateComment(`Đúng${"!".repeat(EXAM_COMMENT_REPEAT_CHAR_MAX)}`), null);
  });

  it("lets legitimate study text through", () => {
    expect(null, [
      "Các bạn ơi câu này chọn B",
      "lon nước ngọt",
      "buổi học hôm nay",
      "class Student kế thừa",
      "assignment 1 nộp chưa",
      "ASP.NET Core và VB.NET, ADO.NET",
      "Socket.IO dùng websocket",
      "đề lấy từ fepass.top",
      "using System.IO; import java.io.*;",
      "s.top() trả về phần tử đầu",
      "vai trò lãnh đạo của Đảng, cách mạng, chính trị",
      "cột sex trong bảng Employee",
      "liên hệ thực tế",
      "pass môn rồi",
      "giá rẻ thu hút khách",
      "ngu",
      "đủ điểm, đèo cao, đi học",
      "Nợ TK 112: 350.000.000, Có TK 511: 50.000.000",
      "Doanh thu 1,250,000,000 và 0.35",
      "Lợi nhuận 30000000 năm 2023",
      "A",
    ]);
  });
});

describe("answerLettersOf", () => {
  it("reads leading uppercase answer letters", () => {
    assert.deepEqual(answerLettersOf("A"), ["A"]);
    assert.deepEqual(answerLettersOf("B vì hàm này trả về null"), ["B"]);
    assert.deepEqual(answerLettersOf("A, C"), ["A", "C"]);
    assert.deepEqual(answerLettersOf("C A nhé"), ["A", "C"]);
    assert.deepEqual(answerLettersOf("D. Theo slide chương 3"), ["D"]);
    assert.deepEqual(answerLettersOf("A, câu này dễ"), ["A"]);
    assert.deepEqual(answerLettersOf("H đúng"), ["H"]);
    assert.deepEqual(answerLettersOf("B là đáp án"), ["B"]);
  });

  it("ignores ordinary sentences", () => {
    for (const s of ["Bài này khó", "a lê", "BẠN ơi", "Chọn A", "C++ là ngôn ngữ", "E-learning", "B-tree", "ABC Company", "A A", "AC", "FE là bài thi cuối kỳ", "DB, rồi tới SQL", "BA là gì", "I think A", "Ai biết không", "A hay B"]) {
      assert.equal(answerLettersOf(s), null, s);
    }
  });
});
