# Rà soát tương tác theo 10 nguyên tắc của Nielsen

Phạm vi: chỉ lớp tương tác và nội dung chữ. Không đổi token/giao diện Material 3, không đổi logic nghiệp vụ hay hợp đồng API.
Mức độ: **Nghiêm trọng** (mất tiền/mất dữ liệu/kẹt luồng), **Lớn** (người dùng bối rối hoặc làm sai), **Nhỏ** (khó chịu, không gây hại).
Trạng thái: ✅ đã sửa trong đợt này · 🔶 cần thêm API/backend · ⏭ để đợt sau.

## 1. Kiểm kê theo từng nguyên tắc

### H1. Hiển thị trạng thái hệ thống
| Vị trí | Vi phạm | Mức | Cách sửa | |
|---|---|---|---|---|
| Thanh toán – `PaymentPanel` | Khi hỏi trạng thái lệnh nạp bị lỗi giữa chừng, lỗi bị nuốt: người dùng thấy màn hình đứng im, không biết đã nhận tiền chưa | Lớn | Hiện băng báo lỗi có "Thử lại ngay" và câu trấn an "tiền không bị mất" | ✅ |
| Nhập đề – `LinkImport` | Hạn mức chỉ lộ ra khi đã hết lượt ("Hết lượt lấy đề hôm nay") | Lớn | Hiện trước khi bấm: khách "miễn phí 1 đề/ngày", thành viên "Số dư của bạn: X credit, đề đã lấy được mở lại miễn phí" | ✅ |
| Nhập đề | Không có số "còn bao nhiêu lượt hôm nay" cho khách | Lớn | Cần API trả lượt còn lại | 🔶 |
| Hộp thoại mở khóa giải thích | Đã có `ChargeSummary` (giá, số dư, còn lại) | – | Đạt, giữ nguyên | ✅ |
| Xoá ảnh đại diện / lượt làm dở | Xoá âm thầm, không có phản hồi trạng thái | Nhỏ | Snackbar có "Hoàn tác" (xem H3) | ✅ |

### H2. Khớp với thế giới thực
| Vị trí | Vi phạm | Mức | Cách sửa | |
|---|---|---|---|---|
| ~20 chỗ hiện lỗi (`catch` → `err.message`) | Lỗi kỹ thuật lộ ra: "Lỗi 502", "Lỗi 429", "Failed to fetch", HTML của proxy | Lớn | `errorMessage()` trung tâm (`shared/api/errors.ts`) đổi mọi lỗi sang tiếng Việt đời thường; lỗi 5xx và lỗi mạng luôn dùng câu chuẩn | ✅ |

### H3. Kiểm soát và tự do
| Vị trí | Vi phạm | Mức | Cách sửa | |
|---|---|---|---|---|
| `ResumeList` (xoá lượt làm dở) | Phải qua hộp thoại xác nhận mới xoá được | Lớn | Bỏ hộp thoại, dùng snackbar "Hoàn tác" 7 giây; chỉ gọi API xoá khi hết giờ hoàn tác | ✅ |
| `AvatarUpload` (xoá ảnh) | Xoá ngay, không đường lui | Lớn | Cùng cơ chế "Hoàn tác" | ✅ |
| `PracticePage` (thoát đề từ thư mục) | `window.confirm` của trình duyệt: khác phong cách, không có nút cụ thể | Lớn | Hộp thoại M3 "Thoát và bỏ bài đang làm?" | ✅ |
| Ngoài ra | Mọi hộp thoại đều đóng được bằng Esc và bấm nền; nút "Hủy/Ở lại" luôn ở bên trái | – | Đạt (`Modal`) | ✅ |

### H4. Nhất quán và chuẩn
| Vị trí | Vi phạm | Mức | Cách sửa | |
|---|---|---|---|---|
| Hộp thoại xoá | Nơi dùng hộp thoại, nơi `window.confirm`, nơi xoá thẳng | Lớn | Quy tắc thống nhất (mục 3): đảo ngược được → Hoàn tác; không đảo ngược/tốn tiền → hộp thoại nêu hậu quả | ✅ |
| Lời lỗi | Mỗi màn một kiểu câu chữ | Lớn | Một nguồn duy nhất `errorMessage()` | ✅ |
| Phần còn dùng lớp tương thích tạm (admin, lịch sử…) | Màu/hình dạng cũ lẫn M3 | Nhỏ | Giai đoạn 2 của M3 | ⏭ |

### H5. Ngăn ngừa lỗi
| Vị trí | Vi phạm | Mức | Cách sửa | |
|---|---|---|---|---|
| `useSubmit` (mọi form) | Nút chỉ khóa sau khi React vẽ lại → bấm đúp/Enter hai lần vẫn gửi hai yêu cầu | Nghiêm trọng | Cờ `inFlight` đồng bộ: lần gọi thứ hai khi lần đầu chưa xong bị bỏ qua | ✅ |
| `DepositPage` | Người dùng dễ tạo nhiều lệnh nạp song song dù còn lệnh chưa trả | Lớn | Băng nhắc "Bạn còn lệnh nạp X chưa thanh toán" + nút "Tiếp tục thanh toán"; nút tạo ghi rõ số tiền: "Tạo lệnh nạp 100.000 ₫" và nói rõ "chưa trừ tiền ở bước này" | ✅ |
| Hộp thoại thoát đề | Nhãn mơ hồ | Lớn | "Ở lại làm tiếp" / "Bỏ bài và thoát", nêu số câu sẽ mất | ✅ |
| Backend tạo lệnh nạp/trừ phí | Chưa có khóa chống lặp (idempotency key) | Lớn | Frontend đã chặn bấm đúp; cần khóa ở backend để chống lặp khi mạng chập chờn | 🔶 |
| Mở khóa giải thích | Gửi kèm giá mong đợi (`expectedPrice`), xem phí trước khi trừ | – | Đạt | ✅ |

### H6. Nhận ra hơn là nhớ lại
| Vị trí | Vi phạm | Mức | Cách sửa | |
|---|---|---|---|---|
| Nạp credit | Phải nhớ lệnh đang dở | Lớn | Băng nhắc lệnh chưa thanh toán (H5) | ✅ |
| Nhập đề | Phải nhớ số dư/chính sách | Nhỏ | Dòng gợi ý dưới ô nhập (H1) | ✅ |
| Còn lại | Trang nạp đã có mức gợi ý sẵn (`PRESETS`) và thưởng theo bậc | – | Đạt | ✅ |

### H7. Linh hoạt và hiệu quả
| Vị trí | Vi phạm | Mức | Cách sửa | |
|---|---|---|---|---|
| Màn làm bài | Đã có phím tắt (`useQuizShortcuts`), `Kbd` hiển thị | – | Đạt | ✅ |
| Danh sách admin | Chưa có thao tác hàng loạt/bộ lọc đã lưu | Nhỏ | Cân nhắc khi admin có nhu cầu | ⏭ |

### H8. Tối giản
| Vị trí | Vi phạm | Mức | Cách sửa | |
|---|---|---|---|---|
| Trang chủ `LinkImport` | Nhiều dòng phụ (giá, độ chính xác, hạn mức) cạnh nhau | Nhỏ | Dòng hạn mức dùng `body-small` màu phụ, không thêm nút mới; một hành động chính ("Lấy đề") | ✅ |
| Phần còn lại | Rà từng trang chưa xong | Nhỏ | Đợt sau | ⏭ |

### H9. Nhận diện, chẩn đoán, khắc phục lỗi
| Vị trí | Vi phạm | Mức | Cách sửa | |
|---|---|---|---|---|
| Lỗi 429 | Hiện "Lỗi 429" hoặc câu không nói làm gì tiếp | Lớn | "Bạn thao tác hơi nhanh. Đợi một lát rồi thử lại nhé." (giữ lời nhắn tiếng Việt cụ thể từ máy chủ nếu có, ví dụ "Bạn nhập sai quá nhiều lần…") | ✅ |
| Mất mạng | "Không kết nối được máy chủ" không hướng dẫn | Lớn | "Mất kết nối mạng. Kiểm tra Internet rồi thử lại, dữ liệu của bạn vẫn còn nguyên." | ✅ |
| Hết phiên đăng nhập | Bị đăng xuất âm thầm, đẩy ra trang đăng nhập | Nghiêm trọng | Snackbar giải thích lý do; đăng nhập xong quay lại đúng trang cũ (`RequireAuth`) | ✅ |
| Lỗi tạm thời ở điểm danh | Chỉ báo "thử lại nhé" | Nhỏ | Nút "Thử lại" ngay trên snackbar (an toàn vì điểm danh có khóa duy nhất theo ngày) | ✅ |
| Lỗi tạm thời ở form khác | Phải bấm lại nút gốc | Nhỏ | Dùng `isRetryable()` + `action` của snackbar khi cần | ✅ (cơ chế) |
| `Retry-After` | Trình duyệt không đọc được vì CORS không công khai header này | Nhỏ | Backend thêm `Retry-After` vào `exposedHeaders` để hiện đồng hồ đếm ngược | 🔶 |

### H10. Trợ giúp và tài liệu
| Vị trí | Vi phạm | Mức | Cách sửa | |
|---|---|---|---|---|
| Nạp tiền | Người dùng không rõ khi nào bị trừ tiền | Lớn | Dòng "Chưa trừ tiền ở bước này…" | ✅ |
| Lấy đề lỗi | Không nói credit có bị mất không | Lớn | "Nếu đã bị trừ credit cho lần lấy này, hệ thống tự hoàn lại…" (đã kiểm chứng: backend hoàn phí khi worker thất bại) | ✅ |
| Trạng thái rỗng, onboarding | Đã có `Empty`; chưa có tour ngắn | Nhỏ | Đợt sau | ⏭ |

## 2. Danh sách tệp đã sửa
Mới:
- `frontend/src/shared/api/errors.ts` (phân loại lỗi, `errorMessage`, `isRetryable`)
- `docs/ux-heuristics.md`

Sửa:
- `shared/hooks/useSubmit.ts` (chặn gửi đôi, lời lỗi chuẩn), `shared/hooks/useApi.ts` (lời lỗi chuẩn)
- `shared/context/ToastContext.tsx` (nút hành động "Hoàn tác/Thử lại", `onExpire`, thời lượng)
- `features/practice-session/ResumeList.tsx` (xoá có hoàn tác)
- `features/account/components/AvatarUpload.tsx` (xoá có hoàn tác)
- `features/practice/PracticePage.tsx` (thay `window.confirm`)
- `features/account/pages/DepositPage.tsx`, `features/account/components/PaymentPanel.tsx`, `PublicDepositView.tsx`
- `features/auth/AuthContext.tsx` (thông báo hết phiên)
- `features/exam-import/components/LinkImport.tsx`, `useExamImport.ts`
- `features/check-in/DailyCheckInPopup.tsx`
- Chuyển sang `errorMessage()`: `ChatWidget`, `ExplainPanel`, `ExplainUnlockDialog`, `PeDownloadPage`, `AnswerPendingBanner`, `VerifyEmailNotice`, `VerifyEmailPage`, `SocialLogin`, admin (`ChatbotPage`, `CrawlerConfigForm`, `ExamEditPage`, `ExamsPage`, `GiftCodesPage`)

## 3. Chỗ các nguyên tắc xung đột và lựa chọn
- **Hoàn tác (H3) ↔ Xác nhận (H5):** thao tác đảo ngược được dùng "Hoàn tác" vì xác nhận làm chậm người dùng và người ta bấm "Đồng ý" theo phản xạ. Xoá lượt làm dở và ảnh đại diện thuộc nhóm này nhờ trì hoãn lệnh xoá thật tới khi hết 7 giây. Đổi lại: nếu người dùng đóng tab trong 7 giây đó, mục xoá hiện lại (an toàn hơn là mất nhầm). Chỉ dùng hộp thoại khi thao tác tốn tiền hoặc không thể đảo ngược: trừ credit, thoát bỏ bài chưa lưu, xoá đề (admin).
- **Hiệu quả (H7) ↔ Ngăn lỗi (H5):** không thêm bước xác nhận cho điểm danh hay nạp tiền (tạo lệnh không trừ tiền), nhưng nút ghi rõ số tiền để người dùng nhìn là biết.
- **Tối giản (H8) ↔ Hiển thị trạng thái (H1):** hạn mức hiển thị bằng một dòng chữ phụ, không dùng khối thông báo riêng.
- **Lời lỗi của máy chủ (H2) ↔ Cụ thể (H9):** lỗi 4xx có câu tiếng Việt từ máy chủ giữ nguyên (nó chỉ đúng việc cần sửa); lỗi 5xx/mạng thì luôn dùng câu chuẩn vì nội dung thô có thể là kỹ thuật.

## 4. Mẫu chữ (tiếng Việt)
| Tình huống | Chữ |
|---|---|
| Mất mạng | Mất kết nối mạng. Kiểm tra Internet rồi thử lại, dữ liệu của bạn vẫn còn nguyên. |
| 429 | Bạn thao tác hơi nhanh. Đợi một lát rồi thử lại nhé. |
| Hết phiên | Phiên đăng nhập đã hết hạn nên bạn được đăng xuất. Hãy đăng nhập lại để tiếp tục, dữ liệu của bạn vẫn còn. |
| 5xx | Hệ thống đang gặp sự cố, không phải do bạn. Thử lại sau ít phút… |
| Xoá có hoàn tác | Đã xoá lượt Luyện tập của đề "…" · **Hoàn tác** |
| Thoát đề chưa lưu | Thoát và bỏ bài đang làm? · [Ở lại làm tiếp] [Bỏ bài và thoát] |
| Nạp tiền | Tạo lệnh nạp 100.000 ₫ · Chưa trừ tiền ở bước này. |

## 5. Checklist review mã (dán vào mô tả PR)
**H1 Trạng thái** – [ ] Mỗi lệnh gọi API có đủ trạng thái: đang tải, thành công, thất bại. [ ] Việc dài có tiến độ. [ ] Hạn mức/số dư hiển thị trước khi người dùng hành động.
**H2 Ngôn ngữ** – [ ] Không có mã lỗi, tên kỹ thuật hay `err.message` thô trong giao diện; dùng `errorMessage()`. [ ] Chữ là tiếng Việt thường ngày.
**H3 Kiểm soát** – [ ] Luồng nào cũng có lối thoát (Hủy/Quay lại/Esc). [ ] Thao tác đảo ngược được dùng Hoàn tác, không dùng hộp thoại.
**H4 Nhất quán** – [ ] Dùng thành phần dùng chung (`Modal`, `Button`, `Toast`), cùng cách đặt tên nút với màn tương tự. [ ] Không dùng `window.confirm/alert`.
**H5 Ngăn lỗi** – [ ] Hộp thoại chỉ cho việc tốn tiền/không đảo ngược, nêu đúng hậu quả, nút là động từ cụ thể ("Xoá 12 mục"), không "OK/Đồng ý". [ ] Gửi form qua `useSubmit` (chặn gửi đôi). [ ] Kiểm tra ngay khi nhập. [ ] Mutation tốn tiền có khóa chống lặp phía backend.
**H6 Nhận ra** – [ ] Có mặc định hợp lý, gợi ý, mục gần đây. [ ] Ngữ cảnh (đang ở bước nào, đang có gì dở) luôn thấy được.
**H7 Hiệu quả** – [ ] Việc lặp lại có phím tắt/tìm kiếm/thao tác hàng loạt mà không làm rối luồng cơ bản.
**H8 Tối giản** – [ ] Mỗi màn một hành động chính. [ ] Bỏ thông tin không phục vụ việc đang làm.
**H9 Khắc phục lỗi** – [ ] Lỗi nói rõ chuyện gì sai và làm gì tiếp. [ ] Có xử lý riêng cho 429, mất mạng, hết phiên, kèm đường thử lại (`isRetryable`).
**H10 Trợ giúp** – [ ] Trạng thái rỗng có hướng dẫn. [ ] Chỗ dễ sợ (tiền, mất dữ liệu) có câu giải thích ngay cạnh.
