# Explanation Feedback Reward Implementation Plan

> **For agentic workers:** In this repo the delivery method is the `fepass-feature` skill (backend-engineer, frontend-engineer, qa-reviewer). Steps use checkbox syntax.

**Goal:** Admin xác nhận một đánh giá 👎 là đúng thì người góp ý được cộng credit, lời giải AI cũ bị xóa (và sửa đáp án nếu cần), trong một thao tác.

**Architecture:** Thêm cột `explanation_feedback.reward`, một endpoint `POST /api/v1/admin/explanation-feedback/:id/confirm` chạy một transaction, và hộp "Xem xét" trên trang Đánh giá lời giải AI (cùng kiểu với trang Báo cáo đáp án). Nút đóng không thưởng giữ endpoint `resolve` cũ.

**Tech Stack:** Express 5, Prisma + MySQL, node:test; React + Vite + Tailwind (`md-*`).

**Spec:** phần "Thiết kế" ngay dưới đây.

## Thiết kế

### Hiện trạng
- Trang Báo cáo đáp án: "Duyệt đúng" đã đổi đáp án, cộng credit, xóa lời giải. Không đổi gì ở trang này.
- Trang Đánh giá lời giải AI: nút "Giải quyết" chỉ ghi `resolvedAt`.

### Các cách đã cân nhắc
| Cách | Đánh đổi | |
|---|---|---|
| "Giải quyết" luôn cộng credit | Ít bấm nhất, nhưng góp ý sai cũng được tiền (3/3 góp ý chờ ngày 28/11 đều có đáp án đúng) | Loại |
| Hai nút ngay trên dòng | Nhanh, nhưng dễ thưởng khi chưa đọc lời giải | Loại |
| Nút "Xem xét" mở hộp có đủ dữ liệu, hai hành động trong hộp | Thêm một lần bấm; giống trang Báo cáo đáp án | **Chọn** |

### Luật nghiệp vụ
| # | Luật |
|---|---|
| 1 | Chỉ góp ý 👎 đang mở mới xác nhận được; xử lý rồi thì thôi, không thưởng bù |
| 2 | Lời giải đang lưu phải đúng là bản bị chê (tạo trước lần góp ý cuối). Đã tạo lại hoặc đã xóa: không thưởng, chỉ đóng được |
| 3 | Mỗi bản lời giải chỉ thưởng một lần. Các 👎 đang mở khác của cùng câu tự đóng, thưởng 0 |
| 4 | Người góp ý đang có báo cáo đáp án chờ duyệt cho câu đó: chặn, xử lý ở trang Báo cáo đáp án (tránh thưởng hai lần) |
| 5 | Thưởng **50** credit khi chỉ lời giải sai; **200** (bằng báo cáo đáp án) khi admin đồng thời sửa đáp án |
| 6 | Đáp án sửa phải khác đáp án hiện tại |
| 7 | Người đã mua lời giải câu đó xem bản tạo lại không mất thêm phí (giữ nguyên lượt mua) |
| 8 | Lời giải tạo lại thì người đã chê được đánh giá lại; góp ý mới mở lại và `reward` về 0 (lịch sử nằm ở sổ ví) |

Giao dịch ví dùng loại `REPORT_REWARD` sẵn có, ghi chú `Góp ý lời giải đúng: <tên đề>, câu N` (không thêm giá trị enum). Chuông thông báo tự có từ sổ ví.

### Giao diện

```
Đề A · câu 20   An · 17/11 · Sai đáp án hoặc kết luận        [ Xem xét ]

┌ Đề A · câu 20 ───────────────────────────────────┐
│ [ảnh câu hỏi]            Đáp án hiện tại: B     │
│ Góp ý: "Đáp án đúng là A"                        │
│ Lời giải đang lưu (cuộn được)                    │
│ Đáp án sai? Chọn đáp án đúng (không bắt buộc)    │
│   [A] [B] [C] [D] [E] [F] [G] [H]                │
│ [ Đóng, không thưởng ]   [ Lời giải sai (+50) ]  │
└──────────────────────────────────────────────────┘
```
Chọn đáp án thì nút chính thành "Sửa đáp án (+200 credit)". Cả hai trường hợp đều hỏi xác nhận, liệt kê đúng những gì sẽ xảy ra. Dòng đã xử lý hiện thêm "Đã thưởng N credit".

### Không làm
Email cho người được thưởng; lời mời "góp ý để nhận thưởng" phía người dùng; tự chạy lại AI ngay khi xóa; thưởng hồi tố; đổi trang Báo cáo đáp án.

## Global Constraints

- API chỉ thêm, không đổi/xóa trường cũ; migration chỉ thêm, commit riêng; deploy backend trước frontend.
- UI tiếng Việt; code, commit tiếng Anh; không `Co-Authored-By`/"Generated with".
- Dùng lại `frontend/src/shared` (`Modal`, `useConfirm`, `useSubmit`, `Button`, `ProtectedImg`, `Markdown`) và `OPTIONS` ở `features/practice/config/options`.
- Giữ nguyên kiểu xuống dòng của từng file; `git diff --numstat` chỉ hiện thay đổi thật.
- Test DB chạy với `TEST_DB=1` trên MySQL dùng một lần (`test/helpers/test-db.ts`); không trỏ vào production.

## Review Focus

1. Hai admin xác nhận hai 👎 khác nhau của cùng câu cùng lúc: đúng một người được thưởng (Task 1).
2. Lời giải đã tạo lại sau góp ý: 409, không đổi gì, góp ý vẫn mở (Task 1).
3. Người góp ý có báo cáo đáp án đang chờ cho câu đó: 409, không thưởng (Task 1).
4. Đáp án sửa trùng đáp án hiện tại hoặc rác: lỗi, ví và lời giải giữ nguyên (Task 1, 3).
5. Frontend mới gặp backend cũ (không có `currentAnswer`): ẩn nút xác nhận, vẫn đóng được (Task 4).

---

### Task 1: Migration và xác nhận góp ý

**Files:**
- Create: `backend/prisma/migrations/0100_explanation_feedback_reward/migration.sql`
- Create: `backend/test/explanation-feedback-reward-db.test.ts`
- Modify: `backend/prisma/schema.prisma` (`ExplanationFeedback.reward Int @default(0)`)
- Modify: `backend/src/constants/report.ts`, `backend/src/utils/exam-answers.ts`
- Modify: `backend/src/services/answer-report.service.ts` (dùng `normalizeAnswer`)
- Modify: `backend/src/repositories/explanation-feedback.repository.ts`
- Modify: `backend/src/services/explanation-feedback.service.ts`

**Interfaces:**
- Produces: `EXPLAIN_FEEDBACK_REWARD = 50`
- Produces: `normalizeAnswer(answer: string): string` (chuyển nguyên `normalize` từ answer-report.service)
- Produces: `explanationFeedbackService.confirm(adminId: string, id: string, body: { answer?: string }): Promise<AdminFeedbackRow>` (cùng dạng `adminResolve`, có `reward`)

- [ ] **Step 1: Migration** (đọc skill `prisma-migration`): `ALTER TABLE explanation_feedback ADD COLUMN reward INT NOT NULL DEFAULT 0;`, sửa schema, `npx prisma generate`. Commit `feat(backend): add reward column to explanation feedback`.

- [ ] **Step 2: Viết test trước** (khung setup theo `test/admin-review-db.test.ts`; mỗi `it` dùng một câu hỏi riêng, đáp án "A", có lời giải; `open(user, n)` gửi 👎 qua `submit`; `balance(user)` đọc `users.balance`)

```ts
it("rewards once, deletes the explanation, closes sibling dislikes", async () => {
  const a = await open(member, 1), b = await open(other, 1);
  const row = await m.feedback.confirm(admin, a, {});
  assert.equal(row.reward, 50);
  assert.equal(row.explanation, null);
  assert.equal(await balance(member), 50);
  const sibling = await m.prisma.explanationFeedback.findUniqueOrThrow({ where: { id: b } });
  assert.ok(sibling.resolvedAt);
  assert.equal(sibling.reward, 0);
  await assert.rejects(m.feedback.confirm(admin, a, {}), hasStatus(409));
  await assert.rejects(m.feedback.confirm(admin, b, {}), hasStatus(409));
  assert.equal(await balance(member), 50);
});

it("pays the report reward when the answer is corrected", async () => {
  const row = await m.feedback.confirm(admin, await open(member, 2), { answer: "CA" });
  assert.equal(row.reward, 200);
  assert.equal(row.currentAnswer, "A C");
});

it("lets exactly one of two concurrent confirms win", async () => {
  const ids = [await open(member, 3), await open(other, 3)];
  const done = await Promise.allSettled(ids.map((id) => m.feedback.confirm(admin, id, {})));
  assert.equal(done.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(await m.prisma.walletTransaction.count({ where: { note: { contains: "câu 3" } } }), 1);
});

// câu 4: xóa lời giải rồi tạo bản mới (createdAt sau góp ý) -> 409, feedback.resolvedAt vẫn null, số dư không đổi
// câu 5: tạo answerReport PENDING của member -> 409, lời giải còn nguyên
// câu 6: { answer: "a" } -> 400, resolvedAt null, lời giải còn nguyên
// id không tồn tại -> 404; góp ý 👍 -> 409
```

- [ ] **Step 3: Chạy test, phải fail** — `cd backend && TEST_DB=1 npx tsx --test test/explanation-feedback-reward-db.test.ts` → `confirm is not a function`.

- [ ] **Step 4: Cài đặt `confirm`.** Một `prisma.$transaction`, đúng thứ tự:
  1. Đọc góp ý (`userId, examId, questionNumber, helpful, updatedAt, exam.title`). Không có → 404.
  2. Có `answer`: `normalizeAnswer` phải khác đáp án hiện tại, không thì `AppError` 400 `"Đáp án mới trùng đáp án hiện tại"`.
  3. Có báo cáo `PENDING` của người này cho câu → 409 `"Người này đang có báo cáo đáp án cho câu này, hãy xử lý ở trang Báo cáo đáp án"`.
  4. Góp ý là 👍 hoặc đã có `resolvedAt` → 409 `"Góp ý này đã được xử lý"`. Rồi cổng một người thắng, chạy trước mọi lệnh ghi khác (hai giao dịch xếp hàng ở đây, không deadlock): `questionExplanation.deleteMany where {examId, questionNumber, createdAt: { lte: updatedAt đọc ở bước 1 }}`; `count !== 1` → 409 `"Lời giải đã được tạo lại hoặc đã xóa, bạn chỉ có thể đóng góp ý"`.
  5. Chốt: `updateMany where {id, helpful:false, resolvedAt:null}` đặt `resolvedAt, resolvedById, reward`; `count !== 1` → 409 `"Góp ý này đã được xử lý"`.
  6. Đóng các góp ý 👎 đang mở khác của câu (`resolvedAt, resolvedById`).
  7. Có `answer`: `examRepository.setQuestionAnswer`.
  8. `walletService.applyChange` loại `REPORT_REWARD`, `amount = answer ? ANSWER_REPORT_REWARD : EXPLAIN_FEEDBACK_REWARD`.

  Sau commit: có sửa đáp án thì `void realtimeHub.publishExam(examId)`. Trả dòng admin như `adminResolve`; thêm `reward` vào `adminSelect`, `answer` vào `questionImages` select, và `withExplanations` trả thêm `currentAnswer`.

- [ ] **Step 5: Chạy test, phải pass**, kèm `test/admin-review-db.test.ts`. Commit `feat(backend): reward confirmed explanation feedback`.

### Task 2: Đánh giá lại lời giải đã tạo lại

**Files:**
- Modify: `backend/src/services/explanation-feedback.service.ts` (`submit`, `mine`)
- Modify: `backend/src/repositories/explanation-feedback.repository.ts` (`find` trả thêm `updatedAt`, `resolvedAt`; `upsert` nhận `reward`)
- Modify: `backend/src/repositories/explanation.repository.ts` (`find` trả thêm `createdAt`)
- Test: file test của Task 1

**Interfaces:**
- Produces: `mine()` trả `null` khi lời giải đang lưu mới hơn góp ý; `adminList` trả thêm `explanationStale: boolean`

- [ ] **Step 1: Test**

```ts
it("asks again about a regenerated explanation and reopens the complaint", async () => {
  const id = await open(member, 7);
  await m.feedback.confirm(admin, id, {});
  await regenerate(7); // chờ 5 ms rồi tạo lại question_explanations
  assert.equal(await m.feedback.mine(member, examId, 7), null);
  await open(member, 7); // cùng lý do, cùng nội dung
  const row = await m.prisma.explanationFeedback.findUniqueOrThrow({ where: { id } });
  assert.equal(row.resolvedAt, null);
  assert.equal(row.reward, 0);
});
```

- [ ] **Step 2: Chạy, phải fail** (`mine` trả `false`).
- [ ] **Step 3: Cài đặt.** `reopen` đúng thêm khi `prev.resolvedAt` có và lời giải tạo sau `prev.resolvedAt`; khi reopen đặt `reward: 0`. `mine`: lời giải `createdAt > updatedAt` → `null`. `explanationStale = !resolvedAt && explanation.createdAt > updatedAt`.
- [ ] **Step 4: Pass cả hai file test.** Commit `fix(backend): let members rate a regenerated explanation`.

### Task 3: Endpoint

**Files:**
- Modify: `backend/src/rules/requests/answer-report.request.ts` (export `proposedAnswer`)
- Modify: `backend/src/rules/requests/explanation.request.ts`, `backend/src/controllers/admin.explanation-feedback.controllers.ts`, `backend/src/routes/admin.routes.ts`
- Test: file test của Task 1

**Interfaces:**
- Produces: `confirmFeedbackBody = z.object({ answer: proposedAnswer.optional() }).strict()`
- Produces: `POST /api/v1/admin/explanation-feedback/:id/confirm`, message `"Đã xác nhận, lời giải cũ đã xóa và người góp ý nhận thưởng"`, data = dòng admin

- [ ] **Step 1: Test** — `confirmFeedbackBody.safeParse({ answer: "Z9" }).success === false`; `{ extra: 1 }` false; `{}` true.
- [ ] **Step 2: Fail → cài đặt** schema, controller `confirm`, route cạnh `/resolve` (cùng router admin nên đã có kiểm quyền).
- [ ] **Step 3: Pass; `npm run typecheck`.** Commit `feat(backend): add confirm endpoint for explanation feedback`.

### Task 4: Giao diện admin

**Files:**
- Create: `frontend/src/features/admin/content/FeedbackReviewDialog.tsx`
- Modify: `frontend/src/features/admin/content/FeedbackPage.tsx`, `frontend/src/features/admin/api/admin.api.ts`, `frontend/src/features/answer-report/config.ts`

**Interfaces:**
- Consumes: endpoint Task 3; trường mới `reward?`, `currentAnswer?`, `explanationStale?` (đều optional trong `ExplanationFeedbackAdmin`)
- Produces: `adminApi.confirmFeedback(id: string, body: { answer?: string })`; `EXPLAIN_FEEDBACK_REWARD = 50`; `FeedbackReviewDialog({ feedback, onClose, onDone })`

- [ ] **Step 1:** Thêm API, kiểu, hằng số.
- [ ] **Step 2:** Viết dialog theo khung `ReportReviewDialog.tsx` và mockup ở trên. Bắt buộc:
  - Nút chính ẩn khi `currentAnswer` không có; vô hiệu khi `explanationStale` hoặc `explanation === null`, kèm dòng chữ nói lý do (không chỉ làm mờ nút).
  - Nút đáp án có `aria-pressed`, cao tối thiểu 44px; chọn đúng đáp án hiện tại thì coi như chưa chọn khác và nút chính vô hiệu kèm gợi ý.
  - Xác nhận: `Lời giải câu N sẽ bị xóa [, đáp án đổi từ X thành Y] và <tên> được thưởng <credit>.`
  - Đang gửi thì khóa cả hai nút; lỗi hiện bằng `FormError`; xong thì toast, `refreshReviewCounts()`, tải lại danh sách.
- [ ] **Step 3:** `FeedbackPage`: thay nút "Giải quyết" bằng "Xem xét" (icon `SearchCheck`); dòng có `reward > 0` hiện badge `Đã thưởng N credit`; sửa mô tả trang thành `"Đọc các đánh giá chưa tốt. Xác nhận đúng thì lời giải cũ bị xóa và người góp ý được thưởng credit."`
- [ ] **Step 4:** `cd frontend && npm run build`; kiểm tay trên dev ở 360px và desktop: đóng không thưởng, thưởng 50, sửa đáp án thưởng 200, trường hợp lời giải đã tạo lại. Commit `feat(frontend): review dialog for explanation feedback`.

### Task 5: Changelog và kiểm tra cuối

- [ ] **Step 1:** Mục `web` (skill `changelog-entry`): `improved` — "Góp ý đúng về lời giải AI được thưởng credit, lời giải được làm lại". Kiểm JSON. Commit `docs: note explanation feedback reward in changelog`.
- [ ] **Step 2:** Skill `verify-changes`: `cd backend && npm run typecheck && TEST_DB=1 npm test`; `cd frontend && npm run build`. Báo rõ phần nào chưa kiểm.
- [ ] **Step 3:** Mở PR. Không merge, không deploy khi chưa được yêu cầu. Khi deploy: backend (có migration) trước, frontend sau.
