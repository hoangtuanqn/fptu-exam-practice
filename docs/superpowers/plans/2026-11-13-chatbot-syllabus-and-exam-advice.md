# Chatbot: đầy đủ syllabus và tư vấn đề gần đây — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cóc Pass trả lời syllabus đầy đủ và liệt kê các đề gần đây của một môn từ chính hệ thống (không cào FuOverflow), với chi phí token gần như không đổi.

**Architecture:** Thay công cụ `find_fuo_exams` (cào web) bằng công cụ `recent_exams` đọc `catalogService.exams` (đề trong DB + đề hệ thống), lọc theo "kỳ gần đây" bằng logic thuần ở `utils`. Sửa prompt hệ thống để câu hỏi syllabus được trả lời dài và đủ, thêm quy tắc tư vấn đề. Giữ Haiku 5.5, không đổi API công khai.

**Tech Stack:** Express + Prisma (MySQL), `@anthropic-ai/sdk` (Haiku 5.5), `node:test` + `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-13-chatbot-syllabus-and-exam-advice-design.md`

## Global Constraints

- Chỉ backend; không đổi API công khai; deploy backend độc lập (CLAUDE.md rule 8).
- Nhánh `feat/chatbot-recent-exams-and-syllabus` (đã có), commit nhỏ, thông điệp tiếng Anh, không có `Co-Authored-By` hay dòng "Generated with Claude" (rule 2).
- Chữ hiển thị cho người dùng (câu trạng thái công cụ, câu trả lời của bot) là tiếng Việt; code, commit, tên biến tiếng Anh.
- Kỳ học: SP tháng 1-4, SU tháng 5-8, FA tháng 9-12, tính theo giờ Việt Nam (UTC+7). "Gần đây" = kỳ hiện tại và kỳ liền trước.
- Không đổi model (`claude-haiku-5-5`), không thêm bộ định tuyến, không giảng kiến thức môn (rule 2 của prompt giữ nguyên).
- Không chạm vào DB production (rule 3).
- Trước khi báo xong chạy `verify-changes`: `npx tsc --noEmit` và `npm test` trong `backend/`.

## Review Focus

- Mã môn gõ kiểu "pro 192", "pro-192", "Pro192" phải ra cùng một môn; "!!" hay chuỗi rỗng trả lỗi, không gọi DB (Task 3).
- Đề không có kỳ trong tên (`term = null`) không bao giờ được tính là "gần đây" (Task 2).
- Ranh giới tháng theo giờ Việt Nam: 31/08 20:00 UTC đã là 01/09 ở Việt Nam, thuộc kỳ FA (Task 1).
- Môn không có đề nào trong hệ thống: trả `error` rõ ràng để bot nói thật, không bịa danh sách (Task 3).
- Khách chưa đăng nhập vẫn dùng được `recent_exams`, nhưng không có `get_my_data` (Task 3).

## File Structure

- Sửa `backend/src/utils/term.ts`: thêm `termIndex`, `currentTermIndex`, `isRecentTerm` (thuần, có test).
- Tạo `backend/src/utils/recent-exams.ts`: `pickExams` (lọc, phân trang, dựng link; thuần, có test).
- Sửa `backend/src/utils/subject-code.ts`: thêm `normalizeSubjectCode` (chuyển từ `fuo-catalog.service.ts`).
- Sửa `backend/src/services/chat-tools.service.ts`: công cụ `recent_exams`, bỏ `find_fuo_exams`, cập nhật `chatToolsFor`, `toolStatus`, `runChatTool`.
- Xoá `backend/src/services/crawler/fuo-catalog.service.ts` (chỉ chatbot dùng nó).
- Sửa `backend/src/constants/chat.ts`: prompt hệ thống.
- Test: `backend/test/term.test.ts` (mở rộng), `backend/test/recent-exams.test.ts`, `backend/test/chat-tools.test.ts`, `backend/test/chat-prompt.test.ts` (mới).
- Có điều kiện: `backend/src/services/syllabus-rag.service.ts` (Task 5).

---

### Task 1: Hàm "kỳ gần đây" ở backend

**Files:**
- Modify: `backend/src/utils/term.ts`
- Test: `backend/test/term.test.ts`

**Interfaces:**
- Produces: `termIndex(term: string | null): number | null`, `currentTermIndex(now?: Date): number`, `isRecentTerm(term: string | null, now?: Date): boolean` (xuất từ `utils/term.ts`).

- [ ] **Step 1: Viết test lỗi** trong `term.test.ts`, khối `describe("isRecentTerm")`:
  - tại `new Date("2026-11-13T05:00:00Z")`: `FA26` true, `SU26` true, `SP26` false, `FA25` false, `null` false;
  - tại `new Date("2027-01-10T05:00:00Z")`: `FA26` true, `SU26` false, `SP27` true;
  - ranh giới giờ Việt Nam: `isRecentTerm("SP26", new Date("2026-08-31T10:00:00Z"))` là true, còn `isRecentTerm("SP26", new Date("2026-08-31T20:00:00Z"))` là false;
  - `termIndex("FA24") > termIndex("SU24")` và `termIndex("xx")` là null.
- [ ] **Step 2: Chạy `cd backend && node --import tsx --test test/term.test.ts`**, kỳ vọng FAIL (hàm chưa có).
- [ ] **Step 3: Cài đặt** ba hàm trong `utils/term.ts`. Chỉ số kỳ = `năm(2 số) * 3 + {SP:0, SU:1, FA:2}`. `currentTermIndex` lấy tháng và năm theo giờ Việt Nam bằng cách cộng 7 giờ vào `now` rồi đọc `getUTCMonth()` / `getUTCFullYear()`; tháng 1-4 là SP, 5-8 là SU, 9-12 là FA. `isRecentTerm` true khi `termIndex(term) >= currentTermIndex(now) - 1`.
- [ ] **Step 4: Chạy lại test**, kỳ vọng PASS.
- [ ] **Step 5: Commit** `feat: backend knows which semesters count as recent`.

### Task 2: Hàm chọn đề (thuần)

**Files:**
- Create: `backend/src/utils/recent-exams.ts`
- Test: `backend/test/recent-exams.test.ts`

**Interfaces:**
- Consumes: `isRecentTerm` (Task 1).
- Produces:
  ```ts
  export interface ExamLite { threadId: string; title: string; postedAt: Date | null; term: string | null; status: "owned" | "ready" | "fetch"; questions: number | null }
  export type ExamRow = [title: string, term: string | null, status: ExamLite["status"], questions: number | null, postedAt: string | null, link: string]
  export function pickExams(items: ExamLite[], opts: { code: string; recent: boolean; term?: string; limit: number; offset: number; now?: Date }): { matched: number; note?: "no_recent_exams"; rows: ExamRow[] }
  ```
  `items` đã xếp mới nhất trước (đúng thứ tự `catalogService.exams` trả).

- [ ] **Step 1: Viết test lỗi** (bốn đề mẫu: FA26 ready, SU26 fetch, SP25 owned, một đề `term: null`), kiểm tra:
  - `recent: true` ở `2026-11-13` chỉ trả FA26 và SU26, thứ tự giữ nguyên, `note` undefined;
  - đề `term: null` không bao giờ xuất hiện khi `recent: true`, nhưng xuất hiện khi `recent: false`;
  - mọi đề chỉ có kỳ cũ (ví dụ chỉ SP25) với `recent: true` thì trả tối đa `limit` đề mới nhất và `note: "no_recent_exams"`;
  - `term: "sp25"` (không phân biệt hoa thường) trả đúng đề SP25 và bỏ qua `recent`;
  - `limit: 1, offset: 1` trả đề thứ hai, `matched` vẫn là tổng số khớp;
  - link: `ready` và `owned` là `/exam/{threadId}`, `fetch` là `/account/exams?tab=subject&subject=PRO192`;
  - `postedAt` là chuỗi `YYYY-MM-DD` hoặc null.
- [ ] **Step 2: Chạy test**, kỳ vọng FAIL.
- [ ] **Step 3: Cài đặt `pickExams`.** Thứ tự xử lý: lọc theo `term` (nếu có, so khớp kỳ hoặc tên đề, không phân biệt hoa thường) hoặc theo `recent`; nếu `recent` mà không còn đề nào thì dùng toàn bộ danh sách và đặt `note`; cuối cùng cắt `offset/limit` và dựng `ExamRow`.
- [ ] **Step 4: Chạy lại test**, kỳ vọng PASS.
- [ ] **Step 5: Commit** `feat: pure helper that picks recent exams for the chatbot`.

### Task 3: Công cụ `recent_exams`, gỡ `find_fuo_exams`

**Files:**
- Modify: `backend/src/services/chat-tools.service.ts`, `backend/src/utils/subject-code.ts`
- Delete: `backend/src/services/crawler/fuo-catalog.service.ts`
- Test: `backend/test/chat-tools.test.ts`

**Interfaces:**
- Consumes: `pickExams` (Task 2); `catalogService.exams(code: string, query: { page: number; limit: number; q?: string; term?: string }, userId: number | null)` đã có.
- Produces: `normalizeSubjectCode(raw: string): string | null` (`utils/subject-code.ts`; bỏ khoảng trắng, `_`, `-`, viết hoa, chỉ nhận `/^[A-Z0-9]{2,12}$/`). Công cụ tên `recent_exams` với tham số `subject` (bắt buộc), `recent` (boolean, mặc định true), `term` (string), `limit` (1-10, mặc định 6), `offset` (>=0). Kết quả JSON: `{ subject, total, matched, price, catalogUpdatedAt, note?, items }` hoặc `{ error }`. `chatToolsFor(userId)` trả `[RECENT_EXAMS_TOOL]` cho khách, `[...ACCOUNT_TOOLS, RECENT_EXAMS_TOOL]` cho thành viên.

- [ ] **Step 1: Viết test lỗi** trong `chat-tools.test.ts`:
  - `normalizeSubjectCode("pro 192")`, `"pro-192"`, `"Pro192"` đều là `"PRO192"`; `"!!"` và `""` là null;
  - `chatToolsFor(null).map(t => t.name)` bằng `["recent_exams"]`; `chatToolsFor(7).map(t => t.name)` bằng `["get_my_data", "recent_exams"]`;
  - `JSON.parse(await runChatTool(null, "recent_exams", { subject: "!!" }))` có thuộc tính `error` (không chạm DB);
  - `toolStatus("recent_exams", { subject: "PRO192" })` chứa "PRO192".
- [ ] **Step 2: Chạy `node --import tsx --test test/chat-tools.test.ts`**, kỳ vọng FAIL.
- [ ] **Step 3: Cài đặt.** Chuyển `normalizeSubject` thành `normalizeSubjectCode` trong `utils/subject-code.ts`. Trong `chat-tools.service.ts`: xoá `FUO_TOOL`, `findFuoExams`, `KIND_PREFIX` và import `fuo-catalog.service`; thêm `RECENT_EXAMS_TOOL` (mô tả tiếng Anh ngắn: đề của một môn, mới nhất trước, mặc định chỉ kỳ gần đây, có trạng thái `ready/owned/fetch`), hàm `recentExams(input, userId)` gọi `catalogService.exams(subject, { page: 1, limit: 50 }, userId)` rồi `pickExams`, lấy `catalogUpdatedAt` từ `prisma.fuoThread.aggregate({ where: { subjectCode }, _max: { syncedAt: true } })`; nếu `total === 0` trả `{ error: "Hệ thống chưa có đề nào của môn X" }`. Cập nhật `chatToolsFor`, `toolStatus` ("Đang xem các đề gần đây của môn X…"), `runChatTool` (`recent_exams` chạy cho cả khách) và đoạn chú thích đầu file nhắc `find_fuo_exams`. Xoá file `fuo-catalog.service.ts` sau khi `grep` xác nhận không còn tham chiếu.
- [ ] **Step 4: Chạy lại test và `npx tsc --noEmit`**, kỳ vọng PASS và không lỗi kiểu.
- [ ] **Step 5: Commit** `feat: chatbot lists recent exams from the system instead of scraping FuOverflow`.

### Task 4: Prompt hệ thống

**Files:**
- Modify: `backend/src/constants/chat.ts` (`CHAT_SYSTEM_PROMPT`)
- Test: `backend/test/chat-prompt.test.ts`

**Interfaces:**
- Consumes: tên công cụ `recent_exams` (Task 3).

- [ ] **Step 1: Viết test lỗi:** `CHAT_SYSTEM_PROMPT` chứa `recent_exams` và `<exam_advice>`, không chứa `find_fuo_exams`.
- [ ] **Step 2: Chạy test**, kỳ vọng FAIL.
- [ ] **Step 3: Sửa prompt (tiếng Anh, trả lời tiếng Việt):**
  - `<language_style>`: câu hỏi syllabus được trả lời đầy đủ (mọi thành phần đánh giá kèm trọng số, mọi chương đã có trong nguồn), dùng danh sách hoặc bảng markdown, nêu mã môn và phần syllabus đã dùng; mọi câu khác vẫn "thường dưới 120 từ, không tiêu đề".
  - `<tools>`: thay thẻ `find_fuo_exams` bằng `recent_exams` (đề của một môn, mặc định kỳ gần đây; `recent: false` hoặc `term` cho đề cũ; chỉ nhận mã môn; đề PE không có trong danh mục này, trỏ tới trang Tải đề PE).
  - Thêm `<exam_advice>`: khi người dùng sắp thi hoặc hỏi nên học đề nào, gọi `recent_exams`, liệt kê mới nhất trước bằng link markdown, nói rõ đề nào `ready/owned` (mở ngay) và đề nào `fetch` (tốn `price` credit, trừ Pro), nhắc ngày cập nhật danh mục khi có `catalogUpdatedAt`, không giảng kiến thức, không đoán điểm hay ngày.
  - Giữ nguyên `<rules>` 1-6.
- [ ] **Step 4: Chạy test, `npx tsc --noEmit`**, kỳ vọng PASS.
- [ ] **Step 5: Commit** `feat: chatbot prompt answers syllabus in full and advises on recent exams`.

### Task 5 (có điều kiện): đoạn "Cách đánh giá"

**Files:**
- Modify (chỉ khi cần): `backend/src/services/syllabus-rag.service.ts`
- Đo bằng: `backend/scripts/eval-rag.ts` hoặc `backend/scripts/search-syllabus.ts`

- [ ] **Step 1: Đo.** Chạy `npm run eval:rag -- <file flm-syllabus>` nếu có dữ liệu và khoá embedding; nếu không, chạy `scripts/search-syllabus.ts` trên DB dev với ba câu "cách tính điểm của <môn>" cho ba môn khác nhau. Ghi lại: đoạn `assessment` có nằm trong các đoạn `hits` không.
- [ ] **Step 2: Quyết định.** Đều có mặt: ghi "đã đo, không cần sửa" vào mô tả PR và dừng. Nếu không đo được, ghi rõ "chưa đo", không sửa.
- [ ] **Step 3: Chỉ khi có thiếu:** trong `retrieve`, chế độ `subject`, khi `a.kinds.has("assessment")` mà không có đoạn `assessment` nào trong `hits` thì đưa đoạn `assessment` tốt nhất của môn đó lên đầu, thay đoạn cuối (không tăng ngân sách `RAG_MAX_CHUNKS` hay `RAG_MAX_CONTEXT_CHARS`). Viết test cho phần chọn thuần trước khi sửa. Commit `fix: grading questions always get the assessment part of the syllabus`.

### Task 6: Kiểm chứng và mở PR

**Files:** không sửa mã.

- [ ] **Step 1:** `cd backend && npx tsc --noEmit && npm test`, kỳ vọng không lỗi kiểu, toàn bộ test qua.
- [ ] **Step 2: Chạy tay trên máy dev** (khoá Anthropic dev) tám câu: cách tính điểm một môn; các chương một môn; tài liệu một môn; "sắp thi PRO192 nên học đề nào"; môn không tồn tại ("ZZZ999"); mã gõ nhầm ("CSI196"); một câu hướng dẫn FEPass (phải vẫn ngắn); cùng câu đề gần đây khi chưa đăng nhập. Ghi lại từng kết quả và dòng log `[chat] ... in= out= cache_read=`.
- [ ] **Step 3: Số liệu chi phí.** Đưa cho chủ dự án truy vấn chạy trên `chat_logs` (không tự chạy trên production): trung bình `inputTokens`, `outputTokens`, số dòng `truncated` trong 7 ngày trước khi deploy, để so lại sau vài ngày.
- [ ] **Step 4:** Push nhánh và mở PR; không merge hay deploy khi chưa được yêu cầu. Mô tả PR nêu: kết quả Task 5, chưa kiểm tra gì, và nhắc `fuo_threads` do admin nhập tay nên có thể cũ.
