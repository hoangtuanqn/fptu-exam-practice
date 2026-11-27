import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";

// Bình luận câu hỏi trên MySQL thật (TEST_DB=1): lọc rồi hiện ngay, chặn/giữ, gửi trùng, giới hạn, tự bình chọn,
// thích, báo cáo + tự ẩn, admin duyệt xử lý báo cáo, xoá của mình, đếm theo câu.

const loadModules = async () => ({
  prisma: (await import("../src/configs/prisma")).prisma,
  svc: (await import("../src/services/exam-comment.service")).examCommentService,
  reactions: (await import("../src/services/exam-reaction.service")).examReactionService,
  c: await import("../src/constants/exam-comment"),
});

const page = { page: 1, limit: 20 };
const status = (code: number) => (err: unknown) => (err as { status?: number }).status === code;
const blocked = (err: unknown) => (err as { status?: number; code?: string }).status === 422 && (err as { code?: string }).code === "COMMENT_BLOCKED";
const member = (userId: string) => ({ owner: { userId }, isAdmin: false });
const names = new Map<string, string>();
const old = (id: string) => ({ id, createdAt: new Date(0), fullName: names.get(id) ?? "?" }); // tài khoản cũ (không bị giới hạn tài khoản mới)
const who = (id: string) => ({ id, fullName: names.get(id) ?? "?" });

describe("exam comments (MySQL)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb;
  let m: Awaited<ReturnType<typeof loadModules>>;
  let me: string, other: string, third: string, fourth: string, admin: string, exam: string, notMine: string;

  before(async () => {
    db = await createThrowawayDb();
    m = await loadModules();
    const user = async (key: string) => {
      const { id } = await m.prisma.user.create({ data: { email: `${key}@test.local`, fullName: key, password: "x" } });
      names.set(id, key);
      return id;
    };
    const mkExam = async (threadId: string) => {
      const e = await m.prisma.exam.create({ data: { threadId, title: `TST101 ${threadId}`, sourceUrl: "https://example.invalid", totalQuestions: 3, answerSource: "AI" } });
      await m.prisma.examQuestion.createMany({ data: [1, 2, 3].map((n) => ({ examId: e.id, number: n, name: `q${n}`, imagePath: `x/${n}.png`, sourceImage: "s" })) });
      return e.id;
    };
    me = await user("me");
    other = await user("other");
    third = await user("third");
    fourth = await user("fourth");
    admin = await user("admin");
    exam = await mkExam("t1");
    notMine = await mkExam("t2");
    await m.prisma.userExam.createMany({ data: [me, other, third, fourth].map((userId) => ({ userId, examId: exam })) });
  });

  after(async () => {
    await m?.prisma.$disconnect();
    await db?.drop();
  });

  it("rejects an exam outside the library (404) and a question not in the exam (422)", async () => {
    await assert.rejects(m.svc.create(member(me), old(me), notMine, { questionNumber: 1, body: "x" }), status(404));
    await assert.rejects(m.svc.list(member(me), me, notMine, { question: 1, ...page }), status(404));
    await assert.rejects(m.reactions.reactions(member(me), me, notMine, 1), status(404));
    await assert.rejects(m.svc.create(member(me), old(me), exam, { questionNumber: 9, body: "x" }), status(422));
    await assert.rejects(m.reactions.vote(member(me), me, exam, 9, ["A"]), status(422));
    assert.equal(await m.prisma.examComment.count(), 0);
  });

  it("a clean comment is APPROVED at once and visible to others; a blocked one is not stored", async () => {
    const c = await m.svc.create(member(me), old(me), exam, { questionNumber: 1, body: "Câu này hỏi về khái niệm class" });
    assert.equal(c.status, "APPROVED");
    assert.deepEqual([c.mine, c.likes, c.liked], [true, 0, false]);
    await assert.rejects(m.svc.create(member(me), old(me), exam, { questionNumber: 1, body: "câu này hỏi về  khái niệm CLASS" }), status(409)); // trùng
    await assert.rejects(m.svc.create(member(me), old(me), exam, { questionNumber: 1, body: "đm khó" }), blocked);
    assert.equal(await m.prisma.examComment.count(), 1);

    const seen = await m.svc.list(member(other), other, exam, { question: 1, ...page });
    assert.deepEqual(seen.items.map((i) => [i.id, i.mine, i.author.name, i.author.isAdmin]), [[c.id, false, "me", false]]);
    assert.equal(seen.meta.total, 1);
    assert.equal(JSON.stringify(seen).includes(me), false); // không lộ id người viết
    assert.equal(JSON.stringify(seen).includes("flagReason"), false);
    assert.deepEqual(await m.svc.counts(member(other), exam), { counts: { "1": 1 } });
  });

  it("holds suspicious comments with a reason, visible only to the author", async () => {
    const c = await m.svc.create(member(other), old(other), exam, { questionNumber: 2, body: "B, inbox mình nhé" });
    assert.equal(c.status, "PENDING");
    assert.equal((await m.prisma.examComment.findUnique({ where: { id: c.id } }))?.flagReason, "WORDS");
    assert.deepEqual((await m.svc.list(member(other), other, exam, { question: 2, ...page })).items.map((i) => i.status), ["PENDING"]);
    assert.equal((await m.svc.list(member(me), me, exam, { question: 2, ...page })).items.length, 0);
    // bình luận bị giữ chưa có hiệu lực công khai nên không tự bình chọn
    assert.equal((await m.reactions.reactions(member(other), other, exam, 2)).votes.voters, 0);
    await m.reactions.vote(member(other), other, exam, 2, ["B"]);

    const link = await m.svc.create(member(other), old(other), exam, { questionNumber: 3, body: "xem ở abc.com" });
    assert.equal((await m.prisma.examComment.findUnique({ where: { id: link.id } }))?.flagReason, "LINK");
  });

  it("holds the same long text posted on several questions (SPAM)", async () => {
    const body = "Mọi người vào nhóm học chung để trao đổi tài liệu nhé";
    const statuses = [];
    for (const questionNumber of [1, 2, 3]) statuses.push((await m.svc.create(member(third), old(third), exam, { questionNumber, body })).status);
    assert.deepEqual(statuses, ["APPROVED", "APPROVED", "PENDING"]);
    assert.equal((await m.prisma.examComment.findFirst({ where: { userId: third, status: "PENDING" } }))?.flagReason, "SPAM");
  });

  it("holds every comment of a user with recent rejections (STRIKES)", async () => {
    const seeded = await Promise.all(
      Array.from({ length: m.c.EXAM_COMMENT_STRIKES }, (_, i) =>
        m.prisma.examComment.create({ data: { examId: exam, questionNumber: 3, userId: fourth, body: `bad ${i}`, status: "REJECTED", reviewedAt: new Date(), reviewedById: admin } }),
      ),
    );
    const c = await m.svc.create(member(fourth), old(fourth), exam, { questionNumber: 3, body: "ok mà" });
    assert.equal((await m.prisma.examComment.findUnique({ where: { id: c.id } }))?.flagReason, "STRIKES");
    await m.prisma.examComment.deleteMany({ where: { id: { in: [...seeded.map((s) => s.id), c.id] } } });
  });

  it("votes, question likes and comment likes are counts only, idempotent", async () => {
    assert.deepEqual(await m.reactions.vote(member(me), me, exam, 2, ["A", "C"]), { voters: 2, counts: { A: 1, B: 1, C: 1 }, mine: ["A", "C"] });
    assert.deepEqual(await m.reactions.vote(member(me), me, exam, 2, ["C"]), { voters: 2, counts: { B: 1, C: 1 }, mine: ["C"] });
    assert.deepEqual(await m.reactions.vote(member(me), me, exam, 2, []), { voters: 1, counts: { B: 1 }, mine: [] });
    assert.deepEqual((await m.reactions.reactions({ owner: { guestId: "g" }, isAdmin: true }, null, exam, 2)).votes.mine, []);

    assert.deepEqual(await m.reactions.like(member(me), me, exam, 1, true), { likes: 1, liked: true });
    assert.deepEqual(await m.reactions.like(member(me), me, exam, 1, true), { likes: 1, liked: true });
    assert.deepEqual(await m.reactions.like(member(other), other, exam, 1, true), { likes: 2, liked: true });
    assert.deepEqual(await m.reactions.like(member(me), me, exam, 1, false), { likes: 1, liked: false });
    assert.deepEqual(await m.reactions.reactions(member(other), other, exam, 1).then((r) => [r.likes, r.liked]), [1, true]);

    const [c] = (await m.svc.list(member(other), other, exam, { question: 1, ...page })).items;
    assert.deepEqual(await m.svc.like(member(other), who(other), exam, c!.id, true), { likes: 1, liked: true });
    const after = (await m.svc.list(member(other), other, exam, { question: 1, ...page })).items.find((i) => i.id === c!.id)!;
    assert.deepEqual([after.likes, after.liked], [1, true]);
    const pending = await m.prisma.examComment.findFirst({ where: { status: "PENDING" } });
    await assert.rejects(m.svc.like(member(me), who(me), exam, pending!.id, true), status(404)); // chỉ bình luận đang hiện
    await assert.rejects(m.svc.like(member(me), who(me), notMine, c!.id, true), status(404));
  });

  it("reports: once per user, not own, auto-hide at the threshold, reviewed comments only queue", async () => {
    const c = await m.svc.create(member(me), old(me), exam, { questionNumber: 3, body: "bình luận bị báo cáo" });
    await assert.rejects(m.svc.report(member(me), me, exam, c.id, null), status(403));
    assert.deepEqual(await m.svc.report(member(other), other, exam, c.id, "spam"), { reported: true });
    assert.deepEqual(await m.svc.report(member(other), other, exam, c.id, "spam"), { reported: true }); // lặp lại: không thêm
    assert.equal(await m.prisma.examCommentReport.count({ where: { commentId: c.id } }), 1);
    assert.deepEqual((await m.svc.adminSummary()).reported, 1);
    await m.svc.report(member(third), third, exam, c.id, null);
    await m.svc.report(member(fourth), fourth, exam, c.id, null);
    const hidden = await m.prisma.examComment.findUnique({ where: { id: c.id } });
    assert.deepEqual([hidden?.status, hidden?.flagReason], ["PENDING", "REPORTED"]);

    const reported = await m.svc.adminList({ status: "REPORTED", ...page });
    assert.deepEqual(reported.items.map((i) => [i.id, i.reportCount, i.flagReason]), [[c.id, 3, "REPORTED"]]);
    await m.svc.review(admin, c.id, { status: "APPROVED" }); // admin duyệt: báo cáo được xử lý
    assert.equal(await m.prisma.examCommentReport.count({ where: { commentId: c.id } }), 0);
    assert.equal((await m.svc.adminSummary()).reported, 0);

    // đã duyệt tay: đủ báo cáo vẫn hiện, chỉ vào hàng đợi
    for (const u of [other, third, fourth]) await m.svc.report(member(u), u, exam, c.id, null);
    assert.equal((await m.prisma.examComment.findUnique({ where: { id: c.id } }))?.status, "APPROVED");
    assert.equal((await m.svc.adminSummary()).reported, 1);
    assert.deepEqual(await m.svc.bulkReview(admin, { ids: [c.id], status: "APPROVED" }), { updated: 1 });
    assert.equal((await m.svc.adminSummary()).reported, 0);
  });

  it("review transitions are idempotent, rejected comments stay visible to the author only", async () => {
    const c = await m.svc.create(member(other), old(other), exam, { questionNumber: 2, body: "spam" });
    const first = await m.svc.review(admin, c.id, { status: "REJECTED", note: "spam" });
    const again = await m.svc.review(admin, c.id, { status: "REJECTED" });
    assert.equal(first.status, "REJECTED");
    assert.equal(first.reviewNote, "spam");
    assert.deepEqual(first.author, { id: other, email: "other@test.local", fullName: "other" });
    assert.match(first.imageUrl ?? "", /x\/2\.png$/);
    assert.equal(again.status, "REJECTED");
    assert.equal((await m.prisma.examComment.findUnique({ where: { id: c.id } }))?.reviewedById, admin);
    assert.ok((await m.svc.list(member(other), other, exam, { question: 2, ...page })).items.some((i) => i.id === c.id && i.status === "REJECTED"));
    assert.equal((await m.svc.list(member(me), me, exam, { question: 2, ...page })).items.some((i) => i.id === c.id), false);
    assert.equal((await m.svc.review(admin, c.id, { status: "APPROVED" })).status, "APPROVED"); // đổi ý được
    await assert.rejects(m.svc.review(admin, "0190f5a2-1c3b-7000-8000-000000000000", { status: "APPROVED" }), status(404));
  });

  it("admin list search and summary", async () => {
    assert.equal((await m.svc.adminList({ status: "all", q: "inbox", ...page })).meta.total, 1);
    assert.equal((await m.svc.adminList({ status: "all", q: "third@test", ...page })).meta.total, 3);
    const { pending } = await m.svc.adminSummary();
    assert.equal(pending, await m.prisma.examComment.count({ where: { status: "PENDING" } }));
  });

  it("only the author deletes their comment; admin deletes any", async () => {
    const c = await m.svc.create(member(me), old(me), exam, { questionNumber: 2, body: "xoá tôi" });
    await assert.rejects(m.svc.removeOwn(other, exam, c.id), status(404));
    await assert.rejects(m.svc.removeOwn(me, notMine, c.id), status(404));
    assert.deepEqual(await m.svc.removeOwn(me, exam, c.id), { id: c.id, deleted: true });
    await assert.rejects(m.svc.removeOwn(me, exam, c.id), status(404));
    const d = await m.svc.create(member(me), old(me), exam, { questionNumber: 2, body: "admin xoá" });
    assert.deepEqual(await m.svc.adminRemove(d.id), { id: d.id, deleted: true });
    await assert.rejects(m.svc.adminRemove(d.id), status(404));
  });

  it("limits per question, per day and for new accounts (429)", async () => {
    const seed = (userId: string, n: number, questionNumber: (i: number) => number) =>
      m.prisma.examComment.createMany({ data: Array.from({ length: n }, (_, i) => ({ examId: exam, questionNumber: questionNumber(i), userId, body: `seed ${userId} ${i}` })) });
    await seed(fourth, m.c.EXAM_COMMENT_PER_QUESTION_PER_DAY, () => 1);
    await assert.rejects(m.svc.create(member(fourth), old(fourth), exam, { questionNumber: 1, body: "one more" }), status(429));
    assert.equal((await m.svc.create(member(fourth), old(fourth), exam, { questionNumber: 2, body: "câu khác vẫn được" })).status, "APPROVED");

    const already = await m.prisma.examComment.count({ where: { userId: third } });
    await seed(third, m.c.EXAM_COMMENT_NEW_ACCOUNT_PER_DAY - already, (i) => 1 + (i % 3));
    await assert.rejects(m.svc.create(member(third), { ...old(third), createdAt: new Date() }, exam, { questionNumber: 1, body: "tài khoản mới" }), status(429));
    await seed(third, m.c.EXAM_COMMENT_PER_DAY - m.c.EXAM_COMMENT_NEW_ACCOUNT_PER_DAY, () => 100); // câu ngoài đề: chỉ để đếm
    await assert.rejects(m.svc.create(member(third), old(third), exam, { questionNumber: 2, body: "đủ ngày" }), status(429));
  });

  it("image attachments (-id) get comments and likes but no poll; other files are not commentable; deleting a file removes them", async () => {
    const files = (await import("../src/repositories/exam-attachment.repository")).examAttachmentRepository;
    const mk = (examId: string, name: string, mime: string) =>
      m.prisma.examAttachment.create({ data: { examId, name, filePath: `exams/x/files/${name}`, mime, sizeBytes: 1, sourceUrl: "" } }).then((a) => a.id);
    const pdf = await mk(exam, "de.pdf", "application/pdf");
    const png = await mk(exam, "hinh.png", "image/png");
    const oldJpg = await mk(exam, "cu.jpg", "application/octet-stream"); // tải lên trước khi ghi mime ảnh
    const foreign = await mk(notMine, "khac.png", "image/png");

    await assert.rejects(m.svc.create(member(me), old(me), exam, { questionNumber: -foreign, body: "x" }), status(422)); // tệp của đề khác
    await assert.rejects(m.svc.create(member(me), old(me), exam, { questionNumber: -999999, body: "x" }), status(422));
    // tệp không phải ảnh: 422 như mục không tồn tại (bình luận, danh sách, thích, bình chọn)
    await assert.rejects(m.svc.create(member(me), old(me), exam, { questionNumber: -pdf, body: "file này" }), status(422));
    await assert.rejects(m.svc.list(member(me), me, exam, { question: -pdf, ...page }), status(422));
    await assert.rejects(m.reactions.like(member(other), other, exam, -pdf, true), status(422));
    await assert.rejects(m.reactions.vote(member(me), me, exam, -png, ["A"]), status(422));

    // dòng cũ trên tệp pdf (trước quy tắc mới) vẫn còn: admin thấy, không đếm, không trả lời/thích/báo cáo được
    const c = await m.prisma.examComment.create({ data: { examId: exam, questionNumber: -pdf, userId: me, body: "A vì file này đúng", status: "APPROVED" } });
    await m.prisma.examCommentLike.create({ data: { commentId: c.id, userId: other } });
    await m.prisma.examCommentReport.create({ data: { commentId: c.id, userId: third } });
    await assert.rejects(m.svc.create(member(other), old(other), exam, { questionNumber: -pdf, body: "trả lời", replyToId: c.id }), status(422));
    await assert.rejects(m.svc.like(member(other), who(other), exam, c.id, true), status(422));
    await assert.rejects(m.svc.report(member(other), other, exam, c.id, null), status(422));
    await assert.rejects(m.svc.replies(member(other), other, exam, c.id, page), status(422));

    const p = await m.svc.create(member(me), old(me), exam, { questionNumber: -png, body: "ảnh này mờ quá" });
    assert.equal(p.status, "APPROVED");
    assert.deepEqual((await m.reactions.reactions(member(me), me, exam, -png)).votes, { voters: 0, counts: {}, mine: [] }); // không bình chọn
    assert.deepEqual(await m.reactions.like(member(other), other, exam, -png, true), { likes: 1, liked: true });
    assert.equal((await m.svc.create(member(me), old(me), exam, { questionNumber: -oldJpg, body: "ảnh cũ vẫn được" })).status, "APPROVED");
    const counts = (await m.svc.counts(member(me), exam)).counts;
    assert.deepEqual([counts[String(-png)], counts[String(-oldJpg)], counts[String(-pdf)]], [1, 1, undefined]);
    assert.deepEqual((await m.svc.list(member(other), other, exam, { question: -png, ...page })).items.map((i) => i.id), [p.id]);

    const rows = (await m.svc.adminList({ status: "all", q: "file này", ...page })).items;
    assert.deepEqual(rows.map((r) => [r.targetName, r.imageUrl]), [["de.pdf", null]]);
    const img = (await m.svc.adminList({ status: "all", q: "ảnh này mờ", ...page })).items[0]!;
    assert.equal(img.targetName, "hinh.png");
    assert.match(img.imageUrl ?? "", new RegExp(`/exams/${exam}/attachments/${png}\\?v=`));
    assert.equal((await m.svc.adminList({ status: "all", q: "Câu này hỏi về", ...page })).items[0]!.targetName, null); // câu hỏi thật
    assert.match((await m.svc.adminList({ status: "all", q: "ảnh cũ vẫn", ...page })).items[0]!.imageUrl ?? "", /attachments/);

    await files.remove(exam, pdf);
    assert.equal(await m.prisma.examComment.count({ where: { examId: exam, questionNumber: -pdf } }), 0);
    assert.equal(await m.prisma.examCommentLike.count({ where: { commentId: c.id } }), 0);
    assert.equal(await m.prisma.examCommentReport.count({ where: { commentId: c.id } }), 0);
    assert.equal(await m.prisma.examQuestionLike.count({ where: { examId: exam, questionNumber: -png } }), 1); // tệp khác giữ nguyên

    // Ghi đè bằng thư mục mới: trùng tên (HINH.PNG) giữ id và bình luận, tệp biến mất bị xoá, tệp mới được thêm
    const row = (name: string) => ({ name, filePath: `exams/x/files/new-${name}`, mime: "image/png", sizeBytes: 2, sourceUrl: "" });
    await m.prisma.$transaction((tx) => files.syncByName(exam, [row("HINH.PNG"), row("moi.png")], tx));
    const after = await m.prisma.examAttachment.findMany({ where: { examId: exam }, orderBy: { id: "asc" } });
    assert.deepEqual(after.map((a) => a.name), ["HINH.PNG", "moi.png"]);
    assert.equal(after[0]!.id, png);
    assert.equal(after[0]!.filePath, "exams/x/files/new-HINH.PNG");
    assert.equal(await m.prisma.examComment.count({ where: { examId: exam, questionNumber: -png } }), 1);
    assert.equal(await m.prisma.examQuestionLike.count({ where: { examId: exam, questionNumber: -png } }), 1);
    await m.prisma.$transaction((tx) => files.syncByName(exam, [row("moi.png")], tx));
    assert.equal(await m.prisma.examComment.count({ where: { examId: exam, questionNumber: -png } }), 0); // tệp không còn trong thư mục mới

    await m.prisma.$transaction((tx) => files.removeAll(exam, tx));
    assert.equal(await m.prisma.examComment.count({ where: { examId: exam, questionNumber: { lt: 0 } } }), 0);
    assert.equal(await m.prisma.examQuestionLike.count({ where: { examId: exam, questionNumber: { lt: 0 } } }), 0);
    assert.ok((await m.prisma.examComment.count({ where: { examId: exam, questionNumber: { gt: 0 } } })) > 0); // câu hỏi thật không bị đụng
  });

  it("replies: two levels then flat, roots-only list, reactions and notices to authors", async () => {
    const mk = async (key: string) => {
      const { id } = await m.prisma.user.create({ data: { email: `${key}@test.local`, fullName: key, password: "x" } });
      names.set(id, key);
      await m.prisma.userExam.create({ data: { userId: id, examId: exam } });
      return id;
    };
    const [ann, bob, cat] = [await mk("ann"), await mk("bob"), await mk("cat")];
    // thông báo ghi nền (không chờ): đợi tới khi đủ số dòng
    const notices = async (userId: string, kind: string, expected: number) => {
      for (let i = 0; i < 40; i++) {
        const rows = await m.prisma.userNotice.findMany({ where: { userId, kind }, orderBy: { createdAt: "asc" } });
        if (rows.length >= expected) return rows;
        await new Promise((r) => setTimeout(r, 50));
      }
      return m.prisma.userNotice.findMany({ where: { userId, kind } });
    };

    const root = await m.svc.create(member(ann), old(ann), exam, { questionNumber: 2, body: "gốc của ann" });
    const r1 = await m.svc.create(member(bob), old(bob), exam, { questionNumber: 2, body: "bob trả lời", replyToId: root.id });
    assert.deepEqual([r1.status, r1.parentId, r1.replyTo, r1.replyCount], ["APPROVED", root.id, null, 0]);
    const r2 = await m.svc.create(member(cat), old(cat), exam, { questionNumber: 2, body: "cat trả lời bob", replyToId: r1.id });
    assert.deepEqual([r2.parentId, r2.replyTo], [root.id, { name: "bob" }]); // cấp 3 trở đi gắn vào cùng gốc
    await assert.rejects(m.svc.create(member(cat), old(cat), exam, { questionNumber: 3, body: "sai câu", replyToId: root.id }), status(422));
    await assert.rejects(m.svc.create(member(cat), old(cat), exam, { questionNumber: 2, body: "không có", replyToId: "0190f5a2-1c3b-7000-8000-000000000000" }), status(404));
    await assert.rejects(m.svc.create(member(cat), old(cat), notMine, { questionNumber: 2, body: "đề khác", replyToId: root.id }), status(404));
    await assert.rejects(m.svc.create(member(cat), old(cat), exam, { questionNumber: 2, body: "đm", replyToId: root.id }), blocked); // cùng bộ lọc
    const held = await m.svc.create(member(cat), old(cat), exam, { questionNumber: 2, body: "inbox mình nhé", replyToId: root.id });
    assert.equal(held.status, "PENDING");
    await assert.rejects(m.svc.create(member(bob), old(bob), exam, { questionNumber: 2, body: "trả lời bài chờ", replyToId: held.id }), status(404));

    const roots = await m.svc.list(member(bob), bob, exam, { question: 2, ...page });
    assert.ok(roots.items.every((i) => i.parentId === null));
    assert.equal(roots.items.find((i) => i.id === root.id)?.replyCount, 2);
    const forCat = await m.svc.replies(member(cat), cat, exam, root.id, page);
    assert.deepEqual(forCat.items.map((i) => i.id), [r1.id, r2.id, held.id]); // trả lời chờ duyệt của mình xen theo thời gian
    assert.equal(forCat.meta.total, 2);
    assert.deepEqual((await m.svc.replies(member(bob), bob, exam, root.id, page)).items.map((i) => i.id), [r1.id, r2.id]);
    await assert.rejects(m.svc.replies(member(bob), bob, exam, r1.id, page), status(404)); // trả lời không phải gốc
    await assert.rejects(m.svc.replies(member(bob), bob, notMine, root.id, page), status(404));

    // người được trả lời và người viết gốc nhận thông báo, không ai nhận của chính mình; bài bị giữ chỉ báo khi được duyệt
    assert.equal((await notices(ann, "comment.replied", 2)).length, 2);
    const toBob = await notices(bob, "comment.replied", 1);
    assert.deepEqual(toBob.map((n) => [n.title, n.link]), [[`cat đã trả lời bình luận của bạn`, `/exam/${exam}/preview?target=2&comment=${r2.id}`]]);
    assert.equal(await m.prisma.userNotice.count({ where: { userId: cat } }), 0);
    await m.svc.review(admin, held.id, { status: "APPROVED" });
    assert.equal((await notices(ann, "comment.replied", 3)).length, 3);
    const again = await m.svc.review(admin, held.id, { status: "APPROVED" }); // duyệt lại: không báo lần nữa
    await new Promise((r) => setTimeout(r, 200));
    assert.equal(await m.prisma.userNotice.count({ where: { userId: ann, kind: "comment.replied" } }), 3);
    assert.equal(again.parentId, root.id); // dòng admin có parentId

    // cảm xúc: một người một cảm xúc, đổi được; API thích cũ chỉ đụng tới thích
    assert.deepEqual(await m.svc.react(member(bob), who(bob), exam, root.id, "like"), { likes: 1, dislikes: 0, reaction: "like" });
    assert.deepEqual(await m.svc.react(member(bob), who(bob), exam, root.id, "dislike"), { likes: 0, dislikes: 1, reaction: "dislike" });
    assert.deepEqual(await m.svc.like(member(bob), who(bob), exam, root.id, false), { likes: 0, liked: false });
    assert.equal((await m.svc.list(member(bob), bob, exam, { question: 2, ...page })).items.find((i) => i.id === root.id)?.reaction, "dislike");
    assert.deepEqual(await m.svc.react(member(cat), who(cat), exam, root.id, "dislike"), { likes: 0, dislikes: 2, reaction: "dislike" });
    await m.svc.react(member(ann), who(ann), exam, root.id, "like"); // của chính mình: không báo
    assert.deepEqual(await m.svc.react(member(bob), who(bob), exam, root.id, null), { likes: 1, dislikes: 1, reaction: null });
    assert.deepEqual(await m.svc.like(member(bob), who(bob), exam, root.id, true), { likes: 2, liked: true }); // trong giờ: không báo lại
    const liked = await notices(ann, "comment.liked", 1);
    const disliked = await notices(ann, "comment.disliked", 1);
    await new Promise((r) => setTimeout(r, 200));
    assert.deepEqual([liked.length, disliked.length], [1, 1]); // nhiều lượt trong giờ: một thông báo
    assert.equal(liked[0]!.title, "bob đã thích bình luận của bạn");
    assert.ok(!/bob|cat/.test(disliked[0]!.title)); // không lộ ai không thích
    assert.equal(await m.prisma.userNotice.count({ where: { userId: ann, kind: "comment.liked" } }), 1);
    const seen = (await m.svc.list(member(cat), cat, exam, { question: 2, ...page })).items.find((i) => i.id === root.id)!;
    assert.deepEqual([seen.likes, seen.dislikes, seen.reaction, seen.liked], [2, 1, "dislike", false]);

    // đếm theo câu gồm gốc và trả lời đã duyệt; xoá gốc thì xoá cả trả lời
    assert.equal((await m.svc.counts(member(ann), exam)).counts["2"], await m.prisma.examComment.count({ where: { examId: exam, questionNumber: 2, status: "APPROVED" } }));
    await m.svc.adminRemove(root.id);
    assert.equal(await m.prisma.examComment.count({ where: { parentId: root.id } }), 0);
    assert.equal(await m.prisma.examComment.count({ where: { id: { in: [r1.id, r2.id, held.id] } } }), 0);
  });

  it("exam-wide discussion (target 0): comments, #n order, author card, no poll, admin label, notice link", async () => {
    const mk = async (key: string) => {
      const { id } = await m.prisma.user.create({ data: { email: `${key}@test.local`, fullName: key, password: "x" } });
      names.set(id, key);
      await m.prisma.userExam.create({ data: { userId: id, examId: exam } });
      return id;
    };
    const [dan, eve] = [await mk("dan"), await mk("eve")];
    await assert.rejects(m.svc.create(member(dan), old(dan), notMine, { questionNumber: 0, body: "đề khác" }), status(404));
    const ghost = "0190f5a2-1c3b-7000-8000-000000000001";
    await assert.rejects(m.svc.create({ owner: { userId: admin }, isAdmin: true }, old(admin), ghost, { questionNumber: 0, body: "không có đề" }), status(422));

    const first = await m.svc.create(member(dan), old(dan), exam, { questionNumber: 0, body: "A vì đề này dễ" });
    assert.deepEqual([first.status, first.questionNumber, first.index, first.author.commentCount], ["APPROVED", 0, 1, 1]);
    assert.equal(await m.prisma.examQuestionVote.count({ where: { examId: exam, questionNumber: 0 } }), 0); // không tự bình chọn
    const second = await m.svc.create(member(eve), old(eve), exam, { questionNumber: 0, body: "đề năm nay khó hơn" });
    assert.equal(second.index, 2);
    await assert.rejects(m.reactions.vote(member(dan), dan, exam, 0, ["A"]), status(422));
    await assert.rejects(m.reactions.like(member(dan), dan, exam, 0, true), status(422));
    assert.deepEqual(await m.reactions.reactions(member(dan), dan, exam, 0), { likes: 0, liked: false, votes: { voters: 0, counts: {}, mine: [] } });

    const held = await m.svc.create(member(dan), old(dan), exam, { questionNumber: 0, body: "inbox mình nhé" });
    assert.equal(held.index, null);
    const oldestFirst = await m.svc.list(member(dan), dan, exam, { question: 0, order: "oldest", ...page });
    assert.deepEqual(oldestFirst.items.map((i) => [i.id, i.index]), [[held.id, null], [first.id, 1], [second.id, 2]]);
    const newestFirst = await m.svc.list(member(eve), eve, exam, { question: 0, order: "newest", page: 1, limit: 1 });
    assert.deepEqual(newestFirst.items.map((i) => [i.id, i.index]), [[second.id, 2]]);
    assert.deepEqual((await m.svc.list(member(eve), eve, exam, { question: 0, order: "newest", page: 2, limit: 1 })).items.map((i) => i.index), [1]);
    const card = oldestFirst.items.find((i) => i.id === first.id)!.author;
    assert.deepEqual([card.commentCount, card.joinedAt], [1, (await m.prisma.user.findUniqueOrThrow({ where: { id: dan } })).createdAt]);
    assert.equal(JSON.stringify(oldestFirst).includes(dan), false);
    assert.equal((await m.svc.counts(member(dan), exam)).counts["0"], 2);

    const row = (await m.svc.adminList({ status: "all", q: "đề năm nay", ...page })).items[0]!;
    assert.deepEqual([row.targetKind, row.targetName, row.imageUrl, row.questionNumber], ["exam", null, null, 0]);
    assert.equal((await m.svc.adminList({ status: "all", q: "Câu này hỏi về", ...page })).items[0]!.targetKind, "question");

    const reply = await m.svc.create(member(eve), old(eve), exam, { questionNumber: 0, body: "đồng ý", replyToId: first.id });
    assert.equal(reply.index, null);
    for (let i = 0; i < 40 && !(await m.prisma.userNotice.count({ where: { userId: dan, kind: "comment.replied" } })); i++) await new Promise((r) => setTimeout(r, 50));
    const notice = await m.prisma.userNotice.findFirstOrThrow({ where: { userId: dan, kind: "comment.replied" } });
    assert.equal(notice.link, `/exam/${exam}/preview?target=0&comment=${reply.id}`);
    assert.equal((await m.svc.list(member(dan), dan, exam, { question: 0, order: "oldest", ...page })).items.find((i) => i.id === first.id)!.author.commentCount, 1);
    assert.equal((await m.svc.list(member(dan), dan, exam, { question: 0, order: "oldest", ...page })).items.find((i) => i.id === second.id)!.author.commentCount, 2); // gốc + trả lời
  });
});
