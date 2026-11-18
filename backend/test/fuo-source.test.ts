import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FUO_SOURCE_INVALID_LINE } from "../src/constants/fuo-source";
import { addFuoSourcesBody } from "../src/rules/requests/fuo-source.request";
import { renderCommentsText, replaceSection } from "../src/services/crawler/comments-file.service";
import { normalizeQuestionNames } from "../src/services/crawler/thread-scraper.service";
import { pickNewNames, planQuestionMerge } from "../src/utils/exam-merge";
import { parseSourceLines } from "../src/utils/fuo-source-lines";
import { catalogSourceRows } from "../src/utils/fuo-source-queue";
import { createKeyLock } from "../src/utils/key-lock";

describe("FuOverflow source list (pure)", () => {
  it("trims, skips blank lines, rejects non-thread links with their line number and de-duplicates by thread id", () => {
    const text = [
      "  https://fuoverflow.com/threads/pro192-su26-fe.7094/  ",
      "",
      "https://fuoverflow.com/threads/7094/page-2?x=1", // cùng thread 7094
      "https://evil.example/threads/abc.1/",
      "https://fuoverflow.com.evil.example/threads/abc.12/",
      "not a link",
      "http://www.fuoverflow.com/threads/mae101.8000\r",
      `https://fuoverflow.com/threads/${"a".repeat(500)}.9/`,
    ].join("\r\n");
    const r = parseSourceLines(text);
    assert.deepEqual(r.accepted, [
      { line: 1, threadId: "7094", url: "https://fuoverflow.com/threads/pro192-su26-fe.7094/" },
      { line: 7, threadId: "8000", url: "http://www.fuoverflow.com/threads/mae101.8000" },
    ]);
    assert.deepEqual(r.duplicates, [{ line: 3, sameAs: 1 }]);
    assert.deepEqual(r.rejected.map((x) => x.line), [4, 5, 6, 8]);
    assert.ok(r.rejected.every((x) => x.reason === FUO_SOURCE_INVALID_LINE && x.text.length <= 500));
  });

  it("paste body stays under the 100kb JSON limit: at most 90,000 characters and 1000 lines", () => {
    const line = "https://fuoverflow.com/threads/1/";
    assert.equal(addFuoSourcesBody.safeParse({ text: Array(1000).fill(line).join("\n") }).success, true);
    // Vượt giới hạn: validator tự báo rõ (422), không rơi vào lỗi 413 chung của body-parser
    const tooManyLines = addFuoSourcesBody.safeParse({ text: Array(1001).fill("x").join("\n") });
    assert.equal(tooManyLines.error?.issues[0]?.message, "Tối đa 1000 dòng mỗi lần dán");
    const tooLong = addFuoSourcesBody.safeParse({ text: "a".repeat(90_001) });
    assert.equal(tooLong.error?.issues[0]?.message, "Danh sách quá dài, hãy chia thành nhiều lần dán");
    // Khối tối đa (ASCII, 1000 dòng) vẫn dưới giới hạn body JSON nên tới được validator
    assert.ok(Buffer.byteLength(JSON.stringify({ text: `${"a".repeat(89_001)}${"\n".repeat(999)}` })) < 100 * 1024);
    assert.equal(addFuoSourcesBody.safeParse({ text: " \n " }).success, false);
  });

  it("empty text gives nothing", () => {
    assert.deepEqual(parseSourceLines("\n  \n"), { accepted: [], rejected: [], duplicates: [] });
  });

  it("catalog threads become new links; threads that already have an exam are recorded as processed (not fetched again)", () => {
    const now = new Date("2026-11-18T00:00:00Z");
    assert.deepEqual(catalogSourceRows([{ threadId: "7094", examId: null }, { threadId: "8000", examId: "e1" }], now), [
      { threadId: "7094", url: "https://fuoverflow.com/threads/7094/" },
      { threadId: "8000", url: "https://fuoverflow.com/threads/8000/", status: "DONE", examId: "e1", processedAt: now },
    ]);
  });
});

describe("existing exam merge plan (pure)", () => {
  const img = (s: string, name = s) => ({ url: `https://fuoverflow.com/media/${s}?token=1`, name });
  const q = (number: number, s: string, name = s) => ({ number, name, sourceImage: `https://fuoverflow.com/media/${s}` });

  it("appends only positions without a question when stored questions match the thread", () => {
    assert.deepEqual(planQuestionMerge([q(1, "a"), q(2, "b")], [img("a"), img("b"), img("c"), img("d")]), { orderChanged: false, add: [2, 3] });
    assert.deepEqual(planQuestionMerge([q(1, "a"), q(2, "b")], [img("a"), img("b")]), { orderChanged: false, add: [] });
  });

  it("never deletes: a thread with fewer images adds nothing and is not a conflict", () => {
    assert.deepEqual(planQuestionMerge([q(1, "a"), q(2, "b"), q(3, "c")], [img("a")]), { orderChanged: false, add: [] });
  });

  it("refuses to renumber: an image inserted or changed in the middle adds nothing", () => {
    assert.deepEqual(planQuestionMerge([q(1, "a"), q(2, "b")], [img("a"), img("x"), img("b")]), { orderChanged: true, add: [] });
  });

  it("new exam shape (no stored questions) takes every image", () => {
    assert.deepEqual(planQuestionMerge([], [img("a"), img("b")]), { orderChanged: false, add: [0, 1] });
  });

  it("same images but a renamed question (the scraper renumbered names) is ORDER_CHANGED", () => {
    assert.deepEqual(planQuestionMerge([q(1, "a", "Q1"), q(2, "b", "Q2")], [img("a", "Q1"), img("b", "Q2-2"), img("c", "Q3")]), { orderChanged: true, add: [] });
  });

  it("stored [Q1, Q2, abc->Q3] and the thread gains Q3.png: nothing is added, Q3 is never overwritten", () => {
    const raw = (name: string) => ({ url: `https://fuoverflow.com/media/${name}.png?token=1`, name });
    const stored = [q(1, "Q1.png", "Q1"), q(2, "Q2.png", "Q2"), q(3, "abc.png", "Q3")];
    const thread = normalizeQuestionNames([raw("Q1"), raw("Q2"), raw("abc"), raw("Q3")]);
    assert.deepEqual(thread.map((t) => t.name), ["Q1", "Q2", "Q3-2", "Q3"]); // tên do scraper đặt lại
    assert.deepEqual(planQuestionMerge(stored, thread), { orderChanged: true, add: [] });
  });

  it("appended names never collide with stored question names or files already in the images folder", () => {
    const stored = ["Q1", "Q2", "Q3"];
    const files = ["Q1.webp", "Q2.webp", "q3.webp", "Q4.webp", "Q5.webp.tmp"];
    const names = pickNewNames(["Q3", "Q4", "q4", "Q6"], stored, files);
    assert.deepEqual(names, ["Q3-2", "Q4-2", "q4-3", "Q6"]);
    const taken = new Set([...stored, ...files.map((f) => f.replace(/\.[^.]*$/, ""))].map((n) => n.toLowerCase()));
    assert.ok(names.every((n) => !taken.has(n.toLowerCase())));
    assert.equal(new Set(names.map((n) => n.toLowerCase())).size, names.length);
  });
});

describe("comments.txt merge (pure)", () => {
  const section = (name: string, text: string) => ({
    image: { url: "", name, fileBase: name },
    comments: [{ id: "1", author: "a", time: "2026-05-04T11:31:15+0700", text, url: "" }],
  });

  it("replaces only the named sections and appends new ones", () => {
    const base = renderCommentsText({ title: "T", url: "U", at: new Date(0) }, [section("Q1", "old1"), section("Q2", "old2")]);
    const next = [section("Q2", "new2"), section("Q3", "new3")].reduce(replaceSection, base);
    assert.match(next, /old1/);
    assert.doesNotMatch(next, /old2/);
    assert.match(next, /new2/);
    assert.match(next, /## Q3 [\s\S]*new3/);
    assert.ok(next.startsWith("T\nU\n"));
  });
});

describe("key lock", () => {
  it("runs tasks of the same key one after another and different keys in parallel", async () => {
    const lock = createKeyLock();
    const log: string[] = [];
    const task = (name: string, ms: number) => async () => {
      log.push(`start ${name}`);
      await new Promise((r) => setTimeout(r, ms));
      log.push(`end ${name}`);
      return name;
    };
    const results = await Promise.all([lock("t1", task("a", 30)), lock("t1", task("b", 1)), lock("t2", task("c", 1))]);
    assert.deepEqual(results, ["a", "b", "c"]);
    assert.ok(log.indexOf("end a") < log.indexOf("start b"), "same key must wait");
    assert.ok(log.indexOf("end c") < log.indexOf("end a"), "other key must not wait");
  });

  it("releases the key when a task throws", async () => {
    const lock = createKeyLock();
    await assert.rejects(lock("k", async () => Promise.reject(new Error("boom"))));
    assert.equal(await lock("k", async () => 1), 1);
  });
});
