// Từ ngữ lọc bình luận (decision 0019). So khớp nguyên từ, CÓ DẤU so có dấu (xem utils/comment-text.ts).
// Cụm nhiều từ viết cách nhau bằng một dấu cách. Không thêm từ hợp lệ trong môn học: đảng, cách mạng, chính trị, sex,
// liên hệ, pass, giá rẻ, ngu (đứng một mình), ASP.NET, VB.NET, ADO.NET, Socket.IO, fepass.top.

// Trúng là từ chối, không lưu
export const COMMENT_BLOCKED_WORDS = [
  // Tục
  "địt", "đụ", "đéo", "lồn", "cặc", "buồi", "chịch", "nứng", "đĩ", "vãi lồn",
  // Viết tắt / không dấu chỉ có một nghĩa
  "đm", "đmm", "đcm", "dcm", "đkm", "dkm", "đcmm", "vcl", "vkl", "clm", "dit me", "dit con me",
  // Xúc phạm
  "óc chó", "chó đẻ", "súc vật", "mất dạy", "con đĩ", "thằng chó", "đồ điếm", "ngu như chó", "ngu như bò", "ngu như lợn", "đi chết đi",
  // Tiếng Anh
  "fuck", "fucking", "motherfucker", "shit", "bitch", "cunt", "asshole", "dickhead", "nigger", "nigga", "faggot", "retarded",
] as const;

// Trúng là lưu nhưng chờ admin duyệt (flagReason WORDS)
export const COMMENT_HELD_WORDS = [
  // Mơ hồ
  "dm", "vl", "cmm", "cmnr", "clgt", "dit", "du ma", "mẹ mày", "bố mày", "đồ ngu", "thằng ngu", "con ngu", "ngu vãi",
  // Đe doạ
  "giết mày", "đánh chết mày", "tao đập",
  // Gian lận / mua bán
  "bán đề", "mua đề", "thi hộ", "học hộ", "làm bài hộ", "thuê làm bài", "phao thi", "tool hack", "hack điểm", "inbox", "ib mình", "ib tui",
  // Quảng cáo / cờ bạc
  "kiếm tiền online", "nhà cái", "cá cược", "tài xỉu", "vay vốn",
  // Người lớn
  "porn", "phim sex", "clip sex",
  // Chính trị / vùng miền
  "phản động", "ba que", "bò đỏ", "việt tân", "parky", "pake",
] as const;

// Từ liên hệ cá nhân (flagReason CONTACT); t.me, facebook.com, fb.com, email và số điện thoại bắt bằng mẫu trong utils/comment-text.ts
export const COMMENT_CONTACT_WORDS = ["zalo", "telegram"] as const;

// Đuôi tên miền coi là link (flagReason LINK)
export const COMMENT_LINK_TLDS = ["com", "vn", "net", "org", "io", "me", "gg", "ly", "xyz", "top", "site"] as const;

// Tên có dấu chấm hợp lệ trong môn học: bỏ ra trước khi tìm tên miền
export const COMMENT_LINK_ALLOWED = ["asp.net", "vb.net", "ado.net", "socket.io", "fepass.top", "java.io", "java.net", "system.io", "system.net"] as const;
