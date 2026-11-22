import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import sharp from "sharp";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";

// Đóng góp đề thi (TEST_DB=1, MySQL dùng một lần). Ảnh ghi vào thư mục tạm, không đụng storage thật.
const STORAGE = fs.mkdtempSync(path.join(os.tmpdir(), "fepass-contrib-"));
process.env.STORAGE_DIR = STORAGE; // configs/env đọc lúc import (import động bên dưới)

const load = async () => ({
  prisma: (await import("../src/configs/prisma")).prisma,
  service: (await import("../src/services/exam-contribution.service")).examContributionService,
  limit: (await import("../src/constants/exam-contribution")).CONTRIBUTION_MAX_PENDING_PER_USER,
});
const hasStatus = (status: number) => (error: unknown) => (error as { status?: number }).status === status;
const body = (extra: { subjectCode?: string; term?: string } = {}) => ({ subjectCode: "TST101", title: undefined, term: undefined, note: undefined, ...extra });
const file = (buffer: Buffer) => ({ buffer }) as Express.Multer.File;
const leftovers = () => (fs.existsSync(path.join(STORAGE, "contributions")) ? fs.readdirSync(path.join(STORAGE, "contributions")) : []);

describe("exam contributions (throwaway MySQL)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb;
  let m: Awaited<ReturnType<typeof load>>;
  let member: string, admin: string;
  let png: Buffer, big: Buffer;

  before(async () => {
    db = await createThrowawayDb();
    m = await load();
    const user = async (key: string) => (await m.prisma.user.create({ data: { email: `${key}@example.invalid`, fullName: key, password: "x" } })).id;
    member = await user("member");
    admin = await user("admin");
    await m.prisma.subject.create({ data: { code: "TST101", name: "Test" } });
    png = await sharp({ create: { width: 40, height: 20, channels: 3, background: "#fff" } }).png().toBuffer();
    big = await sharp({ create: { width: 4000, height: 1000, channels: 3, background: "#000" } }).jpeg().toBuffer();
  });
  after(async () => {
    await m?.prisma.$disconnect();
    await db?.drop();
    fs.rmSync(STORAGE, { recursive: true, force: true });
  });

  it("converts every image to webp, caps the long side, and lists it", async () => {
    const row = await m.service.create(member, body({ term: "SP25" }), [file(png), file(big)]);
    assert.deepEqual({ status: row.status, imageCount: row.imageCount }, { status: "PENDING", imageCount: 2 });
    const second = await sharp(path.join(STORAGE, "contributions", row.id, "002.webp")).metadata();
    assert.deepEqual([second.format, second.width, second.height], ["webp", 2400, 600]);
    assert.ok((await m.service.imagePath(row.id, 1)).endsWith("001.webp"));
    await assert.rejects(m.service.imagePath(row.id, 3), hasStatus(404));
    const mine = await m.service.mine(member, { page: 1, limit: 20 });
    assert.equal(mine.meta.total, 1);
    assert.equal(mine.items[0]!.term, "SP25");
  });

  it("rejects bad input and leaves nothing on disk or in the DB", async () => {
    const before = leftovers().length;
    await assert.rejects(m.service.create(member, body(), []), hasStatus(400));
    await assert.rejects(m.service.create(member, body({ subjectCode: "NOPE999" }), [file(png)]), hasStatus(400));
    await assert.rejects(m.service.create(member, body(), [file(png), file(Buffer.from("GIF89a....."))]), /Ảnh thứ 2 không hợp lệ/);
    await assert.rejects(m.service.create(member, body(), [file(png.subarray(0, 40))]), /Ảnh thứ 1 không hợp lệ/);
    assert.equal(leftovers().length, before);
    assert.equal(await m.prisma.examContribution.count(), 1);
  });

  it("caps pending contributions per user with 409", async () => {
    for (let i = (await m.prisma.examContribution.count({ where: { userId: member, status: "PENDING" } })); i < m.limit; i++) {
      await m.service.create(member, body(), [file(png)]);
    }
    await assert.rejects(m.service.create(member, body(), [file(png)]), hasStatus(409));
  });

  it("approves or rejects once; reject removes the files", async () => {
    const { items } = await m.service.list({ page: 1, limit: 20, status: "PENDING" });
    const [a, b] = items;
    assert.ok(a && b && items[0]!.user.email);
    const pending = await m.service.countPending();
    await m.service.approve(admin, a.id, { note: "ok" });
    await assert.rejects(m.service.reject(admin, a.id, {}), hasStatus(409));
    await m.service.reject(admin, b.id, {});
    await assert.rejects(m.service.approve(admin, b.id, {}), hasStatus(409));
    assert.ok(!fs.existsSync(path.join(STORAGE, "contributions", b.id)));
    assert.ok(fs.existsSync(path.join(STORAGE, "contributions", a.id, "001.webp")));
    await assert.rejects(m.service.imagePath(b.id, 1), hasStatus(404));
    assert.equal(await m.service.countPending(), pending - 2);
    assert.equal((await m.service.list({ page: 1, limit: 20, status: "REJECTED" })).meta.total, 1);
  });
});
