import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { attachmentParam, renameAttachmentBody, replaceAttachmentBody } from "../src/rules/requests/exam-upload.request";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";

// Admin quản lý tệp đính kèm của đề (thêm, thay, đổi tên, xoá). Tệp ghi vào thư mục tạm, không đụng storage thật.
const STORAGE = fs.mkdtempSync(path.join(os.tmpdir(), "fepass-attach-"));
process.env.STORAGE_DIR = STORAGE;

describe("attachment validators", () => {
  it("coerces attachmentId and lower-cases the exam id", () => {
    const p = attachmentParam.parse({ id: "0190A000-0000-7000-8000-000000000000", attachmentId: "12" });
    assert.deepEqual(p, { id: "0190a000-0000-7000-8000-000000000000", attachmentId: 12 });
    assert.equal(attachmentParam.safeParse({ id: p.id, attachmentId: "0" }).success, false);
    assert.equal(attachmentParam.safeParse({ id: p.id, attachmentId: "x" }).success, false);
  });
  it("trims the name and caps it by bytes", () => {
    assert.equal(renameAttachmentBody.parse({ name: "  de thi.pdf " }).name, "de thi.pdf");
    assert.equal(renameAttachmentBody.safeParse({ name: "   " }).success, false);
    assert.equal(renameAttachmentBody.safeParse({}).success, false);
    assert.equal(renameAttachmentBody.safeParse({ name: `${"ệ".repeat(67)}.pdf` }).success, false); // 3 byte mỗi ký tự
  });
  it("rename flag only on 1/true", () => {
    assert.equal(replaceAttachmentBody.parse({}).rename, false);
    assert.equal(replaceAttachmentBody.parse({ rename: "1" }).rename, true);
    assert.equal(replaceAttachmentBody.parse({ rename: "0" }).rename, false);
  });
});

const load = async () => ({
  prisma: (await import("../src/configs/prisma")).prisma,
  upload: (await import("../src/services/admin.exam-upload.service")).adminExamUploadService,
  exam: (await import("../src/services/admin.exam.service")).adminExamService,
});
const hasStatus = (status: number) => (error: unknown) => (error as { status?: number }).status === status;
const file = (name: string, text = name) => ({ originalname: Buffer.from(name, "utf8").toString("latin1"), buffer: Buffer.from(text) });

describe("admin exam attachments (throwaway MySQL)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb;
  let m: Awaited<ReturnType<typeof load>>;
  let admin: string;
  let examId: string;
  let otherId: string;

  before(async () => {
    db = await createThrowawayDb();
    m = await load();
    admin = (await m.prisma.user.create({ data: { email: "admin@example.invalid", fullName: "admin", password: "x", role: "ADMIN" } })).id;
    const base = { subjectCode: null, kind: "PE" as const, sourceUrl: "", totalQuestions: 0, answerSource: "DEFAULT" as const };
    examId = (await m.prisma.exam.create({ data: { ...base, threadId: "mattach1", title: "PE one" } })).id;
    otherId = (await m.prisma.exam.create({ data: { ...base, threadId: "mattach2", title: "PE two" } })).id;
  });
  after(async () => {
    await m?.prisma.$disconnect();
    await db?.drop();
    fs.rmSync(STORAGE, { recursive: true, force: true });
  });

  const rows = () => m.prisma.examAttachment.findMany({ where: { examId }, orderBy: { id: "asc" } });
  const onDisk = (p: string) => fs.existsSync(path.join(STORAGE, p));

  it("adds files, keeps old ones, suffixes duplicate names case-insensitively", async () => {
    assert.deepEqual(await m.upload.addFiles(admin, examId, [file("Đề.pdf"), file("note.txt")]), { id: examId, title: "PE one", files: 2, questions: 0, answered: 0 });
    await m.upload.addFiles(admin, examId, [file("đề.PDF"), file("x.exe")]);
    const r = await rows();
    assert.deepEqual(
      r.map((a) => [a.name, a.mime]),
      [
        ["Đề.pdf", "application/pdf"],
        ["note.txt", "text/plain"],
        ["đề-2.PDF", "application/pdf"],
        ["x.exe", "application/octet-stream"],
      ],
    );
    assert.ok(r.every((a) => onDisk(a.filePath) && a.filePath.startsWith("exams/mattach1/files/")));
    await assert.rejects(m.upload.addFiles(admin, examId, []), hasStatus(400));
  });

  it("detail lists attachments in the public shape", async () => {
    const d = await m.exam.detail(examId);
    assert.equal(d.attachments.length, 4);
    const a = d.attachments[0]!;
    assert.deepEqual(Object.keys(a).sort(), ["id", "kind", "mime", "name", "sizeBytes", "url"]);
    assert.equal(a.kind, "pdf");
    assert.match(a.url, new RegExp(`/api/v1/exams/${examId}/attachments/${a.id}\\?v=[0-9a-f]{8}$`));
  });

  it("renames: sanitizes, keeps mime (follows the file on disk), changes the url version, 409 on a case-insensitive clash, 404 for another exam", async () => {
    const [first, second] = await rows();
    const before = (await m.exam.detail(examId)).attachments.find((a) => a.id === second!.id)!;
    const { attachment } = await m.upload.renameFile(admin, examId, second!.id, "sub/../ghi chu.md");
    assert.deepEqual([attachment.name, attachment.mime, attachment.kind], ["ghi chu.md", "text/plain", "text"]);
    assert.notEqual(attachment.url, before.url);
    assert.ok(onDisk(second!.filePath), "file on disk untouched");
    await assert.rejects(m.upload.renameFile(admin, examId, second!.id, "đề.pdf"), hasStatus(409));
    await m.upload.renameFile(admin, examId, first!.id, "ĐỀ.pdf"); // chính nó, chỉ đổi hoa thường
    await assert.rejects(m.upload.renameFile(admin, otherId, first!.id, "a.pdf"), hasStatus(404));
  });

  it("replaces content: same id, new size/mime/url, keeps name (extension follows the new file) unless rename, old file removed", async () => {
    const [first] = await rows();
    const before = (await m.exam.detail(examId)).attachments.find((a) => a.id === first!.id)!;
    const r = await m.upload.replaceFile(admin, examId, first!.id, false, [file("bai.zip", "zip-content-longer")]);
    assert.equal(r.attachment.id, first!.id);
    assert.deepEqual([r.attachment.name, r.attachment.mime, r.attachment.kind, r.attachment.sizeBytes], ["ĐỀ.zip", "application/zip", "archive", 18]);
    assert.deepEqual([r.questions, r.answered], [0, 0]);
    assert.notEqual(r.attachment.url, before.url);
    const same = await m.upload.replaceFile(admin, examId, first!.id, false, [file("khac.ZIP")]);
    assert.equal(same.attachment.name, "ĐỀ.zip", "same extension (any case): name kept as is");
    assert.equal(onDisk(first!.filePath), false);
    const r2 = await m.upload.replaceFile(admin, examId, first!.id, true, [file("ghi chu.md")]);
    assert.equal(r2.attachment.name, "ghi chu-2.md", "renamed to the new file name, deduped against others");
    await assert.rejects(m.upload.replaceFile(admin, examId, first!.id, false, [file("a.pdf"), file("b.pdf")]), hasStatus(400));
    await assert.rejects(m.upload.replaceFile(admin, otherId, first!.id, false, [file("a.pdf")]), hasStatus(404));
  });

  it("removes a row and its file, 404 when not of that exam, may leave the exam empty", async () => {
    await assert.rejects(m.upload.removeFile(admin, otherId, (await rows())[0]!.id), hasStatus(404));
    for (const a of await rows()) {
      assert.deepEqual(await m.upload.removeFile(admin, examId, a.id), { removed: true });
      assert.equal(onDisk(a.filePath), false);
    }
    assert.equal((await rows()).length, 0);
    await assert.rejects(m.upload.removeFile(admin, examId, 999999), hasStatus(404));
  });

  it("does not delete outside storage for a bad stored path", async () => {
    const outside = path.join(os.tmpdir(), `fepass-outside-${process.pid}.txt`);
    fs.writeFileSync(outside, "keep");
    const a = await m.prisma.examAttachment.create({ data: { examId, name: "bad.txt", filePath: `../${path.basename(outside)}`, mime: "text/plain", sizeBytes: 4, sourceUrl: "" } });
    await m.upload.removeFile(admin, examId, a.id);
    assert.ok(fs.existsSync(outside));
    fs.rmSync(outside, { force: true });
  });
});
