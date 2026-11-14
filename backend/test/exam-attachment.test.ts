import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { ATTACHMENT_TOTAL_MAX_BYTES } from "../src/constants/crawler";
import { downloadAttachment } from "../src/services/crawler/attachment-downloader.service";
import type { FuoClient } from "../src/services/crawler/fuo-client";
import { extractFiles, extractImages } from "../src/services/crawler/thread-scraper.service";
import { attachmentFileName, attachmentHeaders, attachmentKind, isAttachmentStaticPath } from "../src/utils/attachment";

const BASE = "https://fuoverflow.com/threads/eng303-su26-fe-wai.6940/";

// Rút gọn từ markup thật của mục "Đính kèm" (li.file của pdf) + một ảnh lightbox trong cùng danh sách
const pdfLi = (href = "/attachments/paper-pdf.284840/") => `
  <li class="file file--linked">
    <a class="file-preview" href="${href}" target="_blank">
      <span class="file-typeIcon"><i class="far fa-file-pdf"><svg><title>paper.pdf</title></svg></i></span>
    </a>
    <div class="file-content"><div class="file-info">
      <span class="file-name" title="paper.pdf">paper.pdf</span>
      <div class="file-meta">172.6 KB &middot; Xem: 62</div>
    </div></div>
  </li>`;
const imageLi = `
  <li class="file file--linked">
    <a class="file-preview js-lbImage" href="/attachments/q1-jpg.284841/"><img src="/data/attachments/284/284841-thumb.jpg" alt="Q1.jpg"></a>
    <div class="file-content"><div class="file-info"><span class="file-name" title="Q1.jpg">Q1.jpg</span></div></div>
  </li>`;
const page = (items: string) => `<section class="message-attachments"><ul class="attachmentList">${items}</ul></section>`;

describe("extractFiles", () => {
  it("returns non-image attachments with the real file name", () => {
    assert.deepEqual(extractFiles(page(pdfLi()), BASE), [{ url: "https://fuoverflow.com/attachments/paper-pdf.284840/", name: "paper.pdf" }]);
  });

  it("does not duplicate lightbox images as files, and dedupes by pathname", () => {
    const html = page(imageLi + pdfLi() + pdfLi("/attachments/paper-pdf.284840/?hash=abc"));
    assert.equal(extractImages(html, BASE).length, 1);
    assert.deepEqual(
      extractFiles(html, BASE).map((f) => f.name),
      ["paper.pdf"],
    );
  });

  it("falls back to the URL slug when the name is missing", () => {
    const html = page(`<li class="file"><a class="file-preview" href="/attachments/de-thi-zip.1/"></a></li>`);
    assert.deepEqual(extractFiles(html, BASE), [{ url: "https://fuoverflow.com/attachments/de-thi-zip.1/", name: "de-thi.zip" }]);
  });

  it("keeps only https FuOverflow (or subdomain) links", () => {
    const html = page(
      pdfLi("https://evil.example/attachments/a-pdf.1/") +
        pdfLi("https://fuoverflow.com.evil.example/attachments/b-pdf.2/") +
        pdfLi("http://fuoverflow.com/attachments/c-pdf.3/") +
        pdfLi("https://cdn.fuoverflow.com/attachments/d-pdf.4/"),
    );
    assert.deepEqual(
      extractFiles(html, BASE).map((f) => f.url),
      ["https://cdn.fuoverflow.com/attachments/d-pdf.4/"],
    );
  });
});

describe("isAttachmentStaticPath", () => {
  it("blocks exams/<id>/files/ in every spelling, lets images through", () => {
    for (const p of [
      "/exams/123/files/a.txt",
      "/EXAMS/123/Files/a.txt",
      "/exams/123/./files/a.txt",
      "/exams/./123/files/a.txt",
      "/exams/123/%2e/files/a.txt",
      "/exams/123/x/../files/a.txt",
      "//exams//123//files/a.txt",
      "/exams%2f123%2ffiles%2fa.txt",
      "/exams\\123\\files\\a.txt",
      "/exams%5c123%5cfiles%5ca.txt",
      "/exams/123/files",
      "/exams/123/%E0%A4%A", // mã hoá lỗi
    ]) {
      assert.equal(isAttachmentStaticPath(p), true, p);
    }
    for (const p of ["/exams/123/images/q1.jpg", "/exams/123/filesx/a.txt", "/exams/files/a.txt"]) {
      assert.equal(isAttachmentStaticPath(p), false, p);
    }
  });
});

describe("attachmentFileName", () => {
  it("keeps the extension, makes names unique, rejects other types", () => {
    const used = new Set<string>();
    assert.equal(attachmentFileName("paper.pdf", used), "paper.pdf");
    assert.equal(attachmentFileName("Paper.PDF", used), "Paper-2.pdf");
    assert.equal(attachmentFileName("evil.html", used), null);
    assert.equal(attachmentFileName("evil.svg", used), null);
    assert.equal(attachmentFileName("noext", used), null);
  });

  it("never produces a path or a dotfile", () => {
    const used = new Set<string>();
    for (const name of ["../../etc/passwd.txt", "..\\..\\win.ini.txt", ".hidden.md", "....zip"]) {
      const out = attachmentFileName(name, used)!;
      assert.ok(out, name);
      assert.ok(!/[/\\]/.test(out) && !out.startsWith("."), `${name} -> ${out}`);
    }
  });
});

describe("attachmentHeaders", () => {
  it("inlines only pdf/text/media, everything else is an octet-stream download", () => {
    assert.match(attachmentHeaders("paper.pdf", "x/paper.pdf", false)["Content-Disposition"], /^inline;/);
    assert.equal(attachmentHeaders("a.md", "x/a.md", false)["Content-Type"], "text/plain; charset=utf-8");
    assert.match(attachmentHeaders("paper.pdf", "x/paper.pdf", true)["Content-Disposition"], /^attachment;/);
    const zip = attachmentHeaders("đề.zip", "x/de.zip", false);
    assert.equal(zip["Content-Type"], "application/octet-stream");
    assert.match(zip["Content-Disposition"], /^attachment; .*filename\*=UTF-8''%C4%91%E1%BB%81\.zip$/);
    assert.equal(attachmentHeaders("x.html", "x/x.html", false)["Content-Type"], "application/octet-stream");
    assert.equal(attachmentKind("x/v.MP4"), "video");
    assert.equal(attachmentKind("x/v.exe"), "other");
  });
});

describe("downloadAttachment", () => {
  const fakeClient = (body: string, headers: Record<string, string> = {}) =>
    ({ config: {}, pause: async () => undefined, fetchOk: async () => new Response(body, { headers }) }) as unknown as FuoClient;
  const file = { url: "https://fuoverflow.com/attachments/paper-pdf.1/", name: "paper.pdf" };

  it("writes the file as-is, skips over-cap files without leaving a temp file, throws on the login page", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "att-"));
    try {
      const ok = await downloadAttachment(fakeClient("%PDF-1.4", { "content-type": "application/pdf" }), file, "paper.pdf", dir, { used: 0 });
      assert.deepEqual(ok && { name: ok.fileName, mime: ok.mime, size: ok.sizeBytes }, { name: "paper.pdf", mime: "application/pdf", size: 8 });
      assert.equal(await fs.readFile(path.join(dir, "paper.pdf"), "utf8"), "%PDF-1.4");

      const budget = { used: ATTACHMENT_TOTAL_MAX_BYTES - 2 };
      assert.equal(await downloadAttachment(fakeClient("0123456789"), file, "big.pdf", dir, budget), null);
      assert.equal(budget.used, ATTACHMENT_TOTAL_MAX_BYTES - 2); // trả lại phần đã tính
      assert.deepEqual(await fs.readdir(dir), ["paper.pdf"]);

      await assert.rejects(downloadAttachment(fakeClient("<html>", { "content-type": "text/html" }), file, "x.pdf", dir, { used: 0 }), /Cookie FuOverflow/);

      // Bị chuyển hướng ra host khác: bỏ qua, không ghi tệp
      const redirected = { fetchOk: async () => Object.defineProperty(new Response("%PDF"), "url", { value: "https://evil.example/a.pdf" }) } as unknown as FuoClient;
      assert.equal(await downloadAttachment(redirected, file, "r.pdf", dir, { used: 0 }), null);
      // Link không phải FuOverflow: không gọi fetch
      const never = { fetchOk: async () => assert.fail("fetched") } as unknown as FuoClient;
      assert.equal(await downloadAttachment(never, { ...file, url: "https://fuoverflow.com.evil.example/a/" }, "e.pdf", dir, { used: 0 }), null);
      assert.deepEqual(await fs.readdir(dir), ["paper.pdf"]);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
