import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import type { FuoClient } from "../src/services/crawler/fuo-client";
import { looksBlocked, parseCount, parseForumPage } from "../src/services/crawler/fuo-forum.service";
import { parseSubjectSemesters } from "../src/services/crawler/fuo-subjects.service";
import { collectThread, extractDescription, extractLabel, isOutsideSubjectForums } from "../src/services/crawler/thread-scraper.service";
import { classifyKind } from "../src/utils/exam-kind";
import { diffCatalogRows, pageHasNews } from "../src/utils/fuo-catalog-diff";

// Danh mục FuOverflow: đọc trang danh sách bài, phân loại đề, so bài đã lưu, và việc lấy đề nhận mọi loại (thuần, không gọi mạng/DB)

const FIXTURE = fs.readFileSync(path.join(__dirname, "fixtures/fuo-forum-page.html"), "utf8");
// Bản lưu đầy đủ của trang thật (không commit, chỉ có trên máy đã lưu): kiểm thêm khi có
const FULL_FIXTURE = path.resolve(__dirname, "../../_workspace/fixtures/fuo-forum-PRJ301.html");

describe("FuOverflow forum page parser", () => {
  it("reads every row (sticky, labelled, unlabelled), its kind, date, replies and the last page", () => {
    const page = parseForumPage(FIXTURE);
    assert.equal(page.isForum, true);
    assert.equal(page.lastPage, 5);
    assert.deepEqual(
      page.rows.map((r) => [r.threadId, r.title, r.label, r.kind, r.replies]),
      [
        ["100", "Quy định đăng bài", null, "OTHER", 1000],
        ["7470", "PRJ301 - SU26 - B5 - RE", "Đề Thi FE", "FE", 0],
        ["7677", "PRJ301 - SU26 - B5 - PE - Paper 2", "Đề Thi PE", "PE", 0],
        ["7001", "PRJ301_SU25_PE_Paper_1", null, "PE", 12],
        ["7002", "PRJ301 Chapter 3", "Quiz", "QUIZ", 0],
      ],
    );
    assert.equal(page.rows[1]!.postedAt?.toISOString(), "2026-11-10T20:01:45.000Z"); // +0700
  });

  it("the full saved page (when present) has 20 rows: 6 FE and 14 PE, 5 pages", { skip: fs.existsSync(FULL_FIXTURE) ? false : "fixture not saved on this machine" }, () => {
    const page = parseForumPage(fs.readFileSync(FULL_FIXTURE, "utf8"));
    assert.equal(page.rows.length, 20);
    assert.equal(page.lastPage, 5);
    assert.equal(page.rows.filter((r) => r.kind === "FE").length, 6);
    assert.equal(page.rows.filter((r) => r.kind === "PE").length, 14);
    assert.ok(page.rows.every((r) => /^\d+$/.test(r.threadId) && r.title && r.postedAt));
  });

  it("a page without the thread list is not a forum page; Cloudflare and login pages look blocked", () => {
    assert.equal(parseForumPage("<html data-template='error'><body>Oops</body></html>").isForum, false);
    assert.equal(looksBlocked("<html><head><title>Just a moment...</title></head></html>"), true);
    assert.equal(looksBlocked("<html data-template='login'><head><title>Log in</title></head></html>"), true);
    assert.equal(looksBlocked(FIXTURE), false);
  });

  it("reply counts: plain numbers and XenForo short forms", () => {
    assert.deepEqual(["0", " 12 ", "1K", "1,2K", "1.5M", "", "abc"].map(parseCount), [0, 12, 1000, 1200, 1_500_000, 0, 0]);
  });
});

describe("exam kind", () => {
  it("label first, then title tokens, else OTHER", () => {
    assert.equal(classifyKind("Đề Thi FE", "PRJ301 PE paper"), "FE");
    assert.equal(classifyKind("Đề Thi PE", "whatever"), "PE");
    assert.equal(classifyKind("Quiz", "x"), "QUIZ");
    assert.equal(classifyKind("Tài liệu", "PRO192 - SU25 - FE"), "FE");
    assert.equal(classifyKind(null, "MAD101_SP26_PE"), "PE");
    assert.equal(classifyKind(null, "CSD201 Quizz chương 2"), "QUIZ");
    assert.equal(classifyKind(null, "JPD113 quizzes"), "QUIZ");
    assert.equal(classifyKind(null, "SWE201c Practical Exam"), "PE");
    assert.equal(classifyKind(null, "MAE101 Final Exam SU24"), "FE");
    assert.equal(classifyKind(null, "Quy định đăng bài"), "OTHER");
  });

  it("does not match tokens inside words", () => {
    assert.equal(classifyKind(null, "TYPE script cafe review"), "OTHER");
    assert.equal(classifyKind(null, "PEA101 FEATURE"), "OTHER");
  });
});

describe("catalog diff", () => {
  const row = (threadId: string, over: Partial<{ title: string; replies: number; postedAt: Date | null }> = {}) => ({
    threadId,
    subjectCode: "PRJ301",
    title: "t",
    label: "Đề Thi FE",
    kind: "FE" as const,
    postedAt: new Date("2026-01-01T00:00:00Z"),
    replies: 1,
    ...over,
  });

  it("splits new and changed rows; unchanged rows are not written again", () => {
    const stored = [row("1"), row("2"), row("3")];
    const { added, changed } = diffCatalogRows(stored, [row("1"), row("2", { replies: 2 }), row("3", { postedAt: new Date("2026-01-01T00:00:00Z") }), row("4")]);
    assert.deepEqual(added.map((r) => r.threadId), ["4"]);
    assert.deepEqual(changed.map((r) => r.threadId), ["2"]);
    assert.deepEqual(diffCatalogRows([row("1", { postedAt: null })], [row("1")]).changed.length, 1);
  });

  it("incremental scan stops at the first page without new or changed rows", () => {
    const stored = [row("1"), row("2")];
    assert.equal(pageHasNews(stored, [row("1"), row("2")]), false); // trang không đổi: dừng
    assert.equal(pageHasNews(stored, [row("1"), row("2", { replies: 9 })]), true); // có bình luận mới: đọc tiếp trang sau
    assert.equal(pageHasNews(stored, [row("1"), row("3")]), true); // có bài mới
    assert.equal(pageHasNews([], [row("1")]), true); // môn chưa quét lần nào: đi hết
    assert.equal(pageHasNews(stored, []), false);
  });
});

describe("subject index (reused parser)", () => {
  it("lists subject forums of every semester and of the unknown group, skipping non-subject forums", () => {
    const html = `<div class="node-main"><div class="node-title"><a href="/categories/semester-1/">Kỳ 1</a></div>
      <ol class="node-subNodeFlatList"><li><a class="subNodeLink subNodeLink--forum" href="/forums/PRF192/">PRF192</a></li><li><a class="subNodeLink subNodeLink--forum" href="/forums/x/">Quy Định</a></li></ol></div>
      <div class="node-main"><div class="node-title"><a href="/categories/tong-hop/">Tổng hợp</a></div>
      <ol class="node-subNodeFlatList"><li><a class="subNodeLink subNodeLink--forum" href="/forums/VOV114/">VOV114</a></li></ol></div>`;
    const { semesters, unknown } = parseSubjectSemesters(html);
    assert.deepEqual([...semesters.keys(), ...unknown], ["PRF192", "VOV114"]);
  });
});

// Trang bài viết tối giản: breadcrumb, tiêu đề có nhãn, bài đầu có chữ, ảnh và tệp đính kèm
const threadPage = (o: { id: string; label?: string; title: string; crumbs?: string; images?: boolean; files?: boolean; body?: string }) => `<!DOCTYPE html>
<html data-content-key="thread-${o.id}"><head><link rel="canonical" href="https://fuoverflow.com/threads/x.${o.id}/" /></head><body>
<ul class="p-breadcrumbs">${o.crumbs ?? `<li><a href="/categories/subjects/"><span>TÀI LIỆU CÁC MÔN HỌC</span></a></li><li><a href="/forums/PRJ301/"><span>PRJ301</span></a></li>`}</ul>
<h1 class="p-title-value">${o.label ? `<a class="labelLink" href="/forums/PRJ301/?prefix_id=1"><span class="label">${o.label}</span></a>` : ""}${o.title}</h1>
<article class="message message--post" data-author="member"><time datetime="2026-11-11T03:01:45+0700"></time>
<div class="message-body"><div class="bbWrapper">${o.body ?? "Đề bài"}${o.images ? `<a class="js-lbImage" href="https://fuoverflow.com/attachments/q1-png.1/"><img src="https://fuoverflow.com/data/attachments/q1.png" alt="Q1.png"></a>` : ""}</div></div>
${o.files ? `<section class="message-attachments"><ul><li class="file"><a class="file-preview" href="https://fuoverflow.com/attachments/given-zip.2/"></a><span class="file-name" title="Given.zip">Given.zip</span></li></ul></section>` : ""}
</article></body></html>`;

const fakeClient = (html: string): FuoClient => ({
  config: { requestDelayMs: 0 } as FuoClient["config"],
  fetchOk: async () => new Response(html),
  pause: async () => undefined,
});

describe("thread import accepts every exam kind", () => {
  it("PE thread with only attachments: kind PE, files kept, description is plain text", async () => {
    const html = threadPage({ id: "7677", label: "Đề Thi PE", title: "PRJ301 - SU26 - PE", files: true, body: "Câu 1: làm <b>servlet</b><br>Câu 2<script>alert(1)</script>" });
    const t = await collectThread(fakeClient(html), "https://fuoverflow.com/threads/7677/");
    assert.deepEqual({ kind: t.kind, label: t.label, images: t.images.length, files: t.files.map((f) => f.name) }, { kind: "PE", label: "Đề Thi PE", images: 0, files: ["Given.zip"] });
    assert.equal(t.description, "Câu 1: làm servlet\nCâu 2");
  });

  it("Quiz and unlabelled threads with images are accepted like FE", async () => {
    const quiz = await collectThread(fakeClient(threadPage({ id: "7002", label: "Quiz", title: "PRJ301 Chapter 3", images: true })), "https://fuoverflow.com/threads/7002/");
    assert.deepEqual({ kind: quiz.kind, images: quiz.images.length }, { kind: "QUIZ", images: 1 });
    const plain = await collectThread(fakeClient(threadPage({ id: "7003", title: "PRJ301 FA25 FE", images: true })), "https://fuoverflow.com/threads/7003/");
    assert.deepEqual({ kind: plain.kind, label: plain.label }, { kind: "FE", label: null });
  });

  it("threads outside the subject forums are refused; pages without breadcrumbs are not judged", async () => {
    const outside = threadPage({ id: "9", title: "Thông báo", images: true, crumbs: `<li><a href="/categories/cong-dong/"><span>Cộng đồng</span></a></li><li><a href="/forums/thong-bao.5/"><span>Thông báo</span></a></li>` });
    assert.equal(isOutsideSubjectForums(outside), true);
    await assert.rejects(collectThread(fakeClient(outside), "https://fuoverflow.com/threads/9/"), /không nằm trong diễn đàn môn học/);
    assert.equal(isOutsideSubjectForums(threadPage({ id: "1", title: "x", crumbs: `<li><a href="/forums/prj301.218/"><span>PRJ301 - Java Web</span></a></li>` })), false);
    assert.equal(isOutsideSubjectForums("<html><body><h1 class='p-title-value'>x</h1></body></html>"), false);
  });

  it("label and description helpers", () => {
    assert.equal(extractLabel(threadPage({ id: "1", title: "x" })), null);
    assert.equal(extractLabel(threadPage({ id: "1", title: "x", label: " Đề Thi  FE " })), "Đề Thi FE");
    assert.equal(extractDescription("<html></html>"), null);
    assert.equal(extractDescription(threadPage({ id: "1", title: "x", body: "a".repeat(6000) }))?.length, 5000);
  });
});
