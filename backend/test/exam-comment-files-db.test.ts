import assert from "node:assert/strict";
import fs from "node:fs";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import sharp from "sharp";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";

// Tệp đính kèm và nhắc tên của bình luận trên MySQL thật (TEST_DB=1), decision 0020. STORAGE_DIR trỏ vào thư mục tạm (không bao giờ là thư mục thật)
const STORAGE = fs.mkdtempSync(path.join(os.tmpdir(), "fepass-comment-files-"));
process.env.STORAGE_DIR = STORAGE;

const loadModules = async () => ({
  prisma: (await import("../src/configs/prisma")).prisma,
  svc: (await import("../src/services/exam-comment.service")).examCommentService,
  files: (await import("../src/services/exam-comment-file.service")).examCommentFileService,
  attachments: (await import("../src/repositories/exam-attachment.repository")).examAttachmentRepository,
  adminExam: (await import("../src/services/admin.exam.service")).adminExamService,
  createApp: (await import("../src/app")).createApp,
  c: await import("../src/constants/exam-comment"),
});

const page = { page: 1, limit: 20 };
const status = (code: number) => (err: unknown) => (err as { status?: number }).status === code;
const member = (userId: string) => ({ owner: { userId }, isAdmin: false });
const names = new Map<string, string>();
const old = (id: string) => ({ id, createdAt: new Date(0), fullName: names.get(id) ?? "?" });
const filesOnDisk = (examId: string) => (fs.existsSync(path.join(STORAGE, "comments", examId)) ? fs.readdirSync(path.join(STORAGE, "comments", examId)) : []);
const PDF = Buffer.from("%PDF-1.4\n%%EOF\n");

describe("comment files and mentions (MySQL)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb;
  let m: Awaited<ReturnType<typeof loadModules>>;
  let me: string, other: string, third: string, gone: string, admin: string, exam: string;
  let jpg: Buffer;

  const notices = async (userId: string, kind: string, expected: number) => {
    for (let i = 0; i < 40; i++) {
      const rows = await m.prisma.userNotice.findMany({ where: { userId, kind } });
      if (rows.length >= expected) return rows;
      await new Promise((r) => setTimeout(r, 50));
    }
    return m.prisma.userNotice.findMany({ where: { userId, kind } });
  };

  before(async () => {
    db = await createThrowawayDb();
    m = await loadModules();
    const user = async (key: string) => {
      const { id } = await m.prisma.user.create({ data: { email: `${key}@test.local`, fullName: key, password: "x" } });
      names.set(id, key);
      return id;
    };
    [me, other, third, gone, admin] = [await user("me"), await user("other"), await user("third"), await user("gone"), await user("admin")];
    const e = await m.prisma.exam.create({ data: { threadId: "f1", title: "TST101 f1", sourceUrl: "https://example.invalid", totalQuestions: 3, answerSource: "AI" } });
    exam = e.id;
    await m.prisma.examQuestion.createMany({ data: [1, 2, 3].map((n) => ({ examId: exam, number: n, name: `q${n}`, imagePath: `x/${n}.png`, sourceImage: "s" })) });
    await m.prisma.userExam.createMany({ data: [me, other, third, gone].map((userId) => ({ userId, examId: exam })) });
    // ảnh lớn có EXIF: phải được thu nhỏ và bỏ metadata
    jpg = await sharp({ create: { width: 3000, height: 40, channels: 3, background: "#c33" } })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Copyright: "gps-secret" } } })
      .toBuffer();
  });

  after(async () => {
    await m?.prisma.$disconnect();
    await db?.drop();
    fs.rmSync(STORAGE, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });

  it("stores valid files, holds the comment for review and returns signed attachments", async () => {
    const c = await m.svc.create(member(me), old(me), exam, { questionNumber: 1, body: "đề câu này đây" }, [
      { name: "ảnh đề.JPG", buffer: jpg },
      { name: "de.pdf", buffer: PDF },
      { name: "ghi chu.txt", buffer: Buffer.from("xin chào") },
    ]);
    assert.equal(c.status, "PENDING");
    assert.equal((await m.prisma.examComment.findUniqueOrThrow({ where: { id: c.id } })).flagReason, "UPLOAD");
    assert.deepEqual(c.attachments.map((a) => [a.name, a.mime, a.isImage]), [["ảnh đề.webp", "image/webp", true], ["de.pdf", "application/pdf", false], ["ghi chu.txt", "text/plain", false]]);
    assert.equal(filesOnDisk(exam).length, 3);
    const row = await m.prisma.examCommentFile.findFirstOrThrow({ where: { commentId: c.id, mime: "image/webp" } });
    const meta = await sharp(fs.readFileSync(path.join(STORAGE, row.filePath))).metadata(); // buffer: sharp giữ tệp mở theo đường dẫn trên Windows
    assert.equal(meta.format, "webp");
    assert.ok(meta.width! <= m.c.EXAM_COMMENT_IMAGE_MAX_SIDE);
    assert.equal(meta.exif, undefined);

    // chỉ người viết và admin thấy bình luận chờ duyệt (và link tệp)
    assert.equal((await m.svc.list(member(other), other, exam, { question: 1, ...page })).items.length, 0);
    assert.equal((await m.svc.list(member(me), me, exam, { question: 1, ...page })).items[0]!.attachments.length, 3);
    const adminRow = (await m.svc.adminList({ status: "PENDING", q: "đề câu này", ...page })).items[0]!;
    assert.equal(adminRow.attachments.length, 3);
    assert.equal(JSON.stringify(adminRow).includes("filePath"), false);

    // một quy tắc văn bản đã giữ thì giữ nguyên lý do đó
    const held = await m.svc.create(member(me), old(me), exam, { questionNumber: 2, body: "xem https://example.com nhé" }, [{ name: "a.pdf", buffer: PDF }]);
    assert.equal((await m.prisma.examComment.findUniqueOrThrow({ where: { id: held.id } })).flagReason, "LINK");
  });

  it("writes nothing when the text is blocked or any file is invalid", async () => {
    const before = filesOnDisk(exam).length;
    const rows = await m.prisma.examComment.count();
    await assert.rejects(m.svc.create(member(me), old(me), exam, { questionNumber: 1, body: "đm khó" }, [{ name: "a.pdf", buffer: PDF }]), status(422));
    for (const bad of [
      [{ name: "a.pdf", buffer: Buffer.from("<html>") }],
      [{ name: "ok.pdf", buffer: PDF }, { name: "x.exe", buffer: Buffer.from("MZ") }],
      [{ name: "ok.pdf", buffer: PDF }, { name: "hong.png", buffer: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(50, 7)]) }], // ảnh hỏng: lỗi sau khi đã ghi tệp đầu
    ]) {
      await assert.rejects(m.svc.create(member(me), old(me), exam, { questionNumber: 3, body: `tệp lỗi ${bad.length}${bad[0]!.name}` }, bad), (err: unknown) => {
        const e = err as { status?: number; errors?: Record<string, string> };
        return e.status === 422 && typeof e.errors?.files === "string";
      });
    }
    assert.equal(filesOnDisk(exam).length, before);
    assert.equal(await m.prisma.examComment.count(), rows);
  });

  it("caps uploaded files per user per day without writing anything", async () => {
    const seed = await m.prisma.examComment.create({ data: { examId: exam, questionNumber: 3, userId: third, body: "seed", status: "PENDING" } });
    await m.prisma.examCommentFile.createMany({ data: Array.from({ length: m.c.EXAM_COMMENT_UPLOADS_PER_DAY }, (_, i) => ({ commentId: seed.id, name: `${i}.pdf`, filePath: `comments/${exam}/none-${i}.pdf`, mime: "application/pdf", sizeBytes: 1 })) });
    const before = filesOnDisk(exam).length;
    await assert.rejects(m.svc.create(member(third), old(third), exam, { questionNumber: 2, body: "thêm tệp" }, [{ name: "a.pdf", buffer: PDF }]), status(429));
    assert.equal(filesOnDisk(exam).length, before);
    assert.equal((await m.svc.create(member(third), old(third), exam, { questionNumber: 2, body: "không tệp vẫn được" })).status, "APPROVED");
    await m.prisma.examComment.delete({ where: { id: seed.id } });
  });

  it("serves files only through the signed route with safe headers", async () => {
    const c = await m.svc.create(member(other), old(other), exam, { questionNumber: 2, body: "tệp để tải" }, [{ name: "anh.png", buffer: jpg }, { name: "bai.txt", buffer: Buffer.from("abc") }]);
    const [img, txt] = c.attachments;
    const server = m.createApp().listen(0);
    try {
      const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const rel = (u: string) => base + u.slice(u.indexOf("/api/v1/"));
      const r1 = await fetch(rel(img!.url));
      assert.equal(r1.status, 200);
      assert.equal(r1.headers.get("content-type"), "image/webp");
      assert.match(r1.headers.get("content-disposition") ?? "", /^inline;/);
      assert.equal(r1.headers.get("x-content-type-options"), "nosniff");
      const r2 = await fetch(rel(txt!.url));
      assert.match(r2.headers.get("content-disposition") ?? "", /^attachment; filename="bai\.txt"/);
      assert.equal(await r2.text(), "abc");
      // chữ ký sai, chữ ký của tệp khác, thiếu chữ ký: 404
      assert.equal((await fetch(rel(img!.url).replace(/s=[0-9a-f]+/, `s=${"0".repeat(32)}`))).status, 404);
      assert.equal((await fetch(rel(img!.url).replace(img!.id, txt!.id))).status, 404);
      assert.equal((await fetch(rel(img!.url).split("?")[0]!)).status, 404);
      // không bao giờ phục vụ tĩnh qua /api/v1/files
      const stored = await m.prisma.examCommentFile.findUniqueOrThrow({ where: { id: img!.id } });
      for (const p of [stored.filePath, stored.filePath.toUpperCase(), stored.filePath.replace("comments", "%63omments")]) assert.equal((await fetch(`${base}/api/v1/files/${p}`)).status, 404, p);
    } finally {
      server.close();
    }
  });

  it("removes files from disk when comments, replies, attachments or the exam are deleted", async () => {
    const root = await m.svc.create(member(me), old(me), exam, { questionNumber: 3, body: "gốc có tệp" }, [{ name: "a.pdf", buffer: PDF }]);
    await m.svc.review(admin, root.id, { status: "APPROVED" });
    const reply = await m.svc.create(member(other), old(other), exam, { questionNumber: 3, body: "trả lời có tệp", replyToId: root.id }, [{ name: "b.pdf", buffer: PDF }]);
    const paths = (await m.prisma.examCommentFile.findMany({ where: { commentId: { in: [root.id, reply.id] } } })).map((f) => path.join(STORAGE, f.filePath));
    assert.equal(paths.filter((p) => fs.existsSync(p)).length, 2);
    await assert.rejects(m.svc.removeOwn(other, exam, root.id), status(404)); // không phải của mình: không xoá gì
    assert.equal(paths.filter((p) => fs.existsSync(p)).length, 2);
    await m.svc.removeOwn(me, exam, root.id);
    assert.equal(paths.filter((p) => fs.existsSync(p)).length, 0);

    const byAdmin = await m.svc.create(member(me), old(me), exam, { questionNumber: 3, body: "admin xoá" }, [{ name: "c.pdf", buffer: PDF }]);
    const p2 = path.join(STORAGE, (await m.prisma.examCommentFile.findFirstOrThrow({ where: { commentId: byAdmin.id } })).filePath);
    await m.svc.adminRemove(byAdmin.id);
    assert.equal(fs.existsSync(p2), false);

    // bình luận trên tệp đính kèm (ảnh) của đề: xoá tệp đính kèm thì repository trả đường dẫn tệp bình luận để xoá
    const att = await m.prisma.examAttachment.create({ data: { examId: exam, name: "h.png", filePath: "exams/f1/files/h.png", mime: "image/png", sizeBytes: 1, sourceUrl: "" } });
    const onFile = await m.svc.create(member(me), old(me), exam, { questionNumber: -att.id, body: "ảnh mờ" }, [{ name: "d.pdf", buffer: PDF }]);
    const p3 = (await m.prisma.examCommentFile.findFirstOrThrow({ where: { commentId: onFile.id } })).filePath;
    assert.deepEqual(await m.attachments.remove(exam, att.id), [p3]);

    // xoá đề: cả thư mục tệp bình luận
    await m.svc.create(member(me), old(me), exam, { questionNumber: 1, body: "còn lại" }, [{ name: "e.pdf", buffer: PDF }]);
    const e2 = await m.prisma.exam.create({ data: { threadId: "f2", title: "TST101 f2", sourceUrl: "https://example.invalid", totalQuestions: 0, answerSource: "AI" } });
    fs.mkdirSync(path.join(STORAGE, "comments", e2.id), { recursive: true });
    fs.writeFileSync(path.join(STORAGE, "comments", e2.id, "x.pdf"), PDF);
    await m.adminExam.remove(admin, e2.id);
    assert.equal(fs.existsSync(path.join(STORAGE, "comments", e2.id)), false);
    assert.ok(filesOnDisk(exam).length > 0); // đề khác không bị đụng
  });

  it("suggests approved authors of the exam and notifies mentioned members once", async () => {
    const o = await m.svc.create(member(other), old(other), exam, { questionNumber: 1, body: "bình luận của other" });
    const t = await m.svc.create(member(third), old(third), exam, { questionNumber: 2, body: "bình luận của third" });
    const g = await m.svc.create(member(gone), old(gone), exam, { questionNumber: 2, body: "bình luận của gone" });
    const mine = await m.svc.create(member(me), old(me), exam, { questionNumber: 2, body: "bình luận của me" });
    await m.prisma.user.update({ where: { id: gone }, data: { deleteRequestedAt: new Date() } });

    const all = await m.svc.mentionCandidates(member(me), me, exam, { q: "", limit: 20 });
    assert.deepEqual(all.map((a) => a.name).sort(), ["other", "third"]); // không có chính mình, tài khoản đã xoá
    assert.equal(JSON.stringify(all).includes(other), false); // không lộ id người dùng
    assert.deepEqual((await m.svc.mentionCandidates(member(me), me, exam, { q: "OTH", limit: 20 })).map((a) => a.name), ["other"]);
    assert.equal((await m.svc.mentionCandidates(member(me), me, exam, { q: "", limit: 1 })).length, 1);
    const otherRef = all.find((a) => a.name === "other")!.ref;

    // chỉ giữ người có @tên trong nội dung; bỏ chính mình, tài khoản đã xoá, ref sai
    const c = await m.svc.create(member(me), old(me), exam, { questionNumber: 1, body: "@other @third @gone @me xem nhé", mentions: [otherRef, g.id, mine.id, "zzz", otherRef] });
    assert.deepEqual(c.mentions, ["other"]);
    const c2 = await m.svc.create(member(me), old(me), exam, { questionNumber: 1, body: "không nhắc tên", mentions: [t.id] });
    assert.deepEqual(c2.mentions, []);
    assert.equal((await notices(other, "comment.mentioned", 1)).length, 1);
    assert.equal((await m.prisma.userNotice.findFirstOrThrow({ where: { userId: other, kind: "comment.mentioned" } })).title, "me đã nhắc đến bạn");

    // bị giữ: báo khi được duyệt; ẩn vì báo cáo rồi duyệt lại không báo lần hai
    const held = await m.svc.create(member(me), old(me), exam, { questionNumber: 3, body: "@third xem https://example.com", mentions: [t.id] });
    assert.equal(held.status, "PENDING");
    await new Promise((r) => setTimeout(r, 200));
    assert.equal((await m.prisma.userNotice.count({ where: { userId: third, kind: "comment.mentioned" } })), 0);
    await m.svc.review(admin, held.id, { status: "APPROVED" });
    assert.equal((await notices(third, "comment.mentioned", 1)).length, 1);
    await m.prisma.examComment.update({ where: { id: held.id }, data: { status: "PENDING", flagReason: "REPORTED" } });
    await m.svc.bulkReview(admin, { ids: [held.id], status: "APPROVED" });
    await new Promise((r) => setTimeout(r, 200));
    assert.equal(await m.prisma.userNotice.count({ where: { userId: third, kind: "comment.mentioned" } }), 1);

    // trả lời và nhắc cùng một người: chỉ nhận thông báo trả lời
    const before = await m.prisma.userNotice.count({ where: { userId: other, kind: "comment.mentioned" } });
    await m.svc.create(member(me), old(me), exam, { questionNumber: 1, body: "@other đúng rồi", replyToId: o.id, mentions: [otherRef] });
    assert.ok((await notices(other, "comment.replied", 1)).length >= 1);
    await new Promise((r) => setTimeout(r, 200));
    assert.equal(await m.prisma.userNotice.count({ where: { userId: other, kind: "comment.mentioned" } }), before);

    // danh sách công khai mang tên người được nhắc
    const listed = (await m.svc.list(member(third), third, exam, { question: 1, ...page })).items.find((i) => i.id === c.id)!;
    assert.deepEqual(listed.mentions, ["other"]);
  });
});
