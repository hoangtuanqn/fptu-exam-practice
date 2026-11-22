import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { AppError } from "../src/rules/error";
import { createUploadQueue, UPLOAD_FAILED_MESSAGE, type StagedFile } from "../src/utils/upload-queue";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "upload-queue-"));
const file = (name: string, text = "x") => ({ originalname: name, buffer: Buffer.from(text) });
const meta = (adminId = "a", title = "T") => ({ adminId, kind: "create" as const, title });
const gate = () => {
  let open!: () => void;
  const p = new Promise<void>((r) => (open = r));
  return { p, open };
};
const quiet = <T>(fn: () => Promise<T>) => {
  const orig = console.error;
  console.error = () => {};
  return fn().finally(() => (console.error = orig));
};

describe("exam upload queue", () => {
  it("runs jobs FIFO one at a time, reads staged files, removes them after success and failure", async () => {
    const dir = tmp();
    const finished: string[] = [];
    const q = createUploadQueue<{ id: string }>({ dir, maxQueued: 5, maxStagedBytes: 1e6, keep: 10, onFinish: (_a, v) => finished.push(`${v.title}:${v.status}`) });
    let running = 0;
    let maxRunning = 0;
    const order: string[] = [];
    const seen: StagedFile[][] = [];
    const job = (name: string, fail?: Error) => async (files: StagedFile[]) => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      order.push(name);
      seen.push(files);
      assert.equal(fs.readFileSync(files[0]!.path, "utf8"), name);
      await new Promise((r) => setTimeout(r, 10));
      running--;
      if (fail) throw fail;
      return { id: `exam-${name}` };
    };
    await quiet(async () => {
      const first = await q.enqueue(meta("a", "1"), [file("Q1.webp", "1")], job("1"));
      assert.equal(first.status, "QUEUED");
      await q.enqueue(meta("a", "2"), [file("Q1.webp", "2")], job("2", new AppError("Ảnh Q1 không đọc được")));
      await q.enqueue(meta("a", "3"), [file("Q1.webp", "3")], job("3", new Error("db down")));
      await q.enqueue(meta("a", "4"), [file("images/Q1.webp", "4")], job("4"));
      await q.idle();
    });
    assert.deepEqual(order, ["1", "2", "3", "4"]);
    assert.equal(maxRunning, 1);
    assert.equal(seen[3]![0]!.originalname, "images/Q1.webp");
    assert.deepEqual(finished, ["1:DONE", "2:FAILED", "3:FAILED", "4:DONE"]);
    const [j4, j3, j2, j1] = q.list("a");
    assert.equal(j1!.examId, "exam-1");
    assert.deepEqual(j1!.result, { id: "exam-1" });
    assert.equal(j2!.error, "Ảnh Q1 không đọc được"); // lời nhắn AppError giữ nguyên
    assert.equal(j3!.error, UPLOAD_FAILED_MESSAGE); // lỗi lạ: lời nhắn chung, không lộ chi tiết
    assert.equal(j4!.status, "DONE");
    assert.deepEqual(fs.readdirSync(dir), []); // không còn tệp tạm nào
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("rejects with 429 when too many uploads wait or the staged bytes would exceed the cap", async () => {
    const dir = tmp();
    const q = createUploadQueue<{ id: string }>({ dir, maxQueued: 1, maxStagedBytes: 10, keep: 10 });
    const g = gate();
    await q.enqueue(meta(), [file("Q1.webp", "aaa")], async () => (await g.p, { id: "1" })); // đang chạy
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(q.isFull(), false);
    await q.enqueue(meta(), [file("Q1.webp", "bbb")], async () => ({ id: "2" })); // chờ
    assert.equal(q.isFull(), true);
    await assert.rejects(q.enqueue(meta(), [file("Q1.webp")], async () => ({ id: "3" })), (e: AppError) => e.status === 429);
    g.open();
    await q.idle();
    assert.equal(q.isFull(), false);
    await assert.rejects(q.enqueue(meta(), [file("Q1.webp", "x".repeat(11))], async () => ({ id: "4" })), (e: AppError) => e.status === 429);
    await q.idle();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("keeps only the last N finished jobs and lists one admin's jobs newest first", async () => {
    const dir = tmp();
    const q = createUploadQueue<{ id: string }>({ dir, maxQueued: 10, maxStagedBytes: 1e6, keep: 3 });
    for (const [admin, title] of [["a", "1"], ["b", "2"], ["a", "3"], ["a", "4"], ["a", "5"]] as const) {
      await q.enqueue(meta(admin, title), [file("Q1.webp")], async () => ({ id: title }));
    }
    await q.idle();
    assert.deepEqual(q.list("a").map((j) => j.title), ["5", "4", "3"]);
    assert.deepEqual(q.list("b"), []);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("clearStaged removes leftovers from a previous run", () => {
    const dir = tmp();
    fs.mkdirSync(path.join(dir, "old-upload"));
    fs.writeFileSync(path.join(dir, "old-upload", "0"), "x");
    createUploadQueue({ dir, maxQueued: 1, maxStagedBytes: 1, keep: 1 }).clearStaged();
    assert.equal(fs.existsSync(dir), false);
  });
});
