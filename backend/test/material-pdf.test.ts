import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { imageAreaRatio, joinTextItems, pdfjsEngine, PdfOpenError, type ImageOps } from "../src/services/materials/pdf-extractor";
import { classifyPage, cleanPageText, groupSections, isPdfBuffer, pageRanges, runPool, titleFromFilename } from "../src/utils/material-analysis";
import { buildPdf } from "./helpers/pdf";

const LONG = "Process scheduling: FCFS, SJF and Round Robin algorithms";

describe("PDF validation and page helpers (pure)", () => {
  it("accepts only buffers whose first bytes contain %PDF-", () => {
    assert.equal(isPdfBuffer(buildPdf([{ text: "a" }])), true);
    assert.equal(isPdfBuffer(Buffer.concat([Buffer.alloc(100, 0x20), Buffer.from("%PDF-1.7")])), true); // rác nhỏ trước header vẫn được
    assert.equal(isPdfBuffer(Buffer.concat([Buffer.alloc(2000, 0x20), Buffer.from("%PDF-1.7")])), false);
    assert.equal(isPdfBuffer(Buffer.from("PK\u0003\u0004 docx pretending to be pdf")), false);
    assert.equal(isPdfBuffer(Buffer.from("\x89PNG\r\n")), false);
    assert.equal(isPdfBuffer(Buffer.alloc(0)), false);
  });

  it("classifies pages: scanned when almost no text, figure when a large image, else text", () => {
    assert.equal(classifyPage("short", 0), "scanned");
    assert.equal(classifyPage(LONG, 0.5), "figure");
    assert.equal(classifyPage(LONG, 0.15), "text"); // phải lớn hơn 15%
    assert.equal(classifyPage(LONG, 0), "text");
  });

  it("cleans and caps page text", () => {
    assert.equal(cleanPageText("  a \t b\n\n  c\u0000 "), "a b\nc");
    assert.equal(cleanPageText("x".repeat(5000)).length, 4000);
  });

  it("formats page ranges and groups consecutive pages into sections", () => {
    assert.equal(pageRanges([5, 3, 4, 9, 11, 12, 3]), "3-5, 9, 11-12");
    assert.equal(pageRanges([]), "");
    assert.deepEqual(
      groupSections([
        { pageNo: 1, chapterNumber: null },
        { pageNo: 2, chapterNumber: 1 },
        { pageNo: 3, chapterNumber: 1 },
        { pageNo: 5, chapterNumber: 1 },
        { pageNo: 6, chapterNumber: 2 },
      ]),
      [
        { chapterNumber: null, from: 1, to: 1 },
        { chapterNumber: 1, from: 2, to: 3 },
        { chapterNumber: 1, from: 5, to: 5 },
        { chapterNumber: 2, from: 6, to: 6 },
      ],
    );
  });

  it("builds a title from the (latin1-decoded) file name", () => {
    assert.equal(titleFromFilename(Buffer.from("Chương 1 - Giới thiệu.pdf", "utf8").toString("latin1")), "Chương 1 - Giới thiệu");
    assert.equal(titleFromFilename(undefined), "Tài liệu");
    assert.equal(titleFromFilename(`${"a".repeat(300)}.PDF`).length, 200);
  });

  it("runPool never runs more than the limit at once and rethrows the first error", async () => {
    let running = 0;
    let peak = 0;
    await runPool([1, 2, 3, 4, 5], 2, async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
    });
    assert.equal(peak, 2);
    const seen: number[] = [];
    await assert.rejects(
      runPool([1, 2, 3, 4, 5, 6], 1, async (n) => {
        seen.push(n);
        if (n === 2) throw new Error("boom");
      }),
      /boom/,
    );
    assert.deepEqual(seen, [1, 2]); // không nhận việc mới sau lỗi
  });
});

describe("PDF extraction with pdf.js", () => {
  it("extracts text, detects large images and scanned pages, renders one page to PNG", async () => {
    const pdf = buildPdf([
      { text: `${LONG}\nSecond line of the slide` },
      { text: LONG, image: { x: 300, y: 40, w: 400, h: 300 } }, // ~31% diện tích trang
      { image: { x: 0, y: 0, w: 720, h: 540 } }, // chỉ có ảnh: trang scan
      { text: LONG, image: { x: 10, y: 10, w: 50, h: 50 } }, // ảnh nhỏ: vẫn là trang chữ
      { text: LONG, image: { x: 0, y: 0, w: 360, h: 540, xobject: true } }, // ảnh XObject nửa trang
    ]);
    const doc = await pdfjsEngine.open(pdf);
    try {
      assert.equal(doc.pageCount, 5);
      const pages = [];
      for (const n of [1, 2, 3, 4, 5]) pages.push(await doc.extractPage(n));
      assert.deepEqual(pages.map((p) => p.kind), ["text", "figure", "scanned", "text", "figure"]);
      assert.ok(Math.abs(pages[4]!.imageAreaRatio - 0.5) < 0.01);
      assert.ok(pages[2]!.imageAreaRatio > 0.99);
      assert.match(pages[0]!.text, /Round Robin/);
      assert.match(pages[0]!.text, /Second line/);
      assert.ok(pages[1]!.imageAreaRatio > 0.25 && pages[1]!.imageAreaRatio < 0.35);
      const png = await doc.renderPng(2);
      assert.deepEqual([...png.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
      assert.equal(Buffer.from(png).readUInt32BE(16), 1000); // 720pt ở 100 dpi
    } finally {
      await doc.close();
    }
  });

  it("refuses broken and password-protected files", async () => {
    await assert.rejects(pdfjsEngine.open(Buffer.from("%PDF-1.4\ngarbage without objects")), PdfOpenError);
    await assert.rejects(pdfjsEngine.open(buildPdf([{ text: LONG }], { encrypted: true })), PdfOpenError);
  });

  it("image area follows save/restore/transform and form XObjects, clipped to the page", () => {
    const ops: ImageOps = { save: 1, restore: 2, transform: 3, paintFormXObjectBegin: 4, paintFormXObjectEnd: 5, paintImageXObject: 6, paintInlineImageXObject: 7, paintImageMaskXObject: 8, paintInlineImageXObjectGroup: 9, paintImageMaskXObjectGroup: 10, paintImageXObjectRepeat: 11 };
    const view = [0, 0, 100, 100];
    // ảnh 50x50 trong save/transform; sau restore ma trận về gốc nên ảnh 1x1 kế tiếp chỉ tính 1
    assert.equal(imageAreaRatio([1, 3, 6, 2, 6], [[], [50, 0, 0, 50, 0, 0], ["img"], [], ["img"]], ops, view), (2500 + 1) / 10000);
    // form XObject dịch sang phải 75: ảnh 50x100 chỉ còn 25x100 trong trang
    assert.equal(imageAreaRatio([4, 3, 7, 5], [[[1, 0, 0, 1, 75, 0], null], [50, 0, 0, 100, 0, 0], [{}], []], ops, view), 0.25);
    assert.equal(imageAreaRatio([3, 6], [[300, 0, 0, 300, 0, 0], ["img"]], ops, view), 1); // tối đa 1
    assert.equal(imageAreaRatio([11], [["img", 10, 10, [0, 0, 20, 20]]], ops, view), 0.02);
  });

  it("joins text items keeping line breaks", () => {
    assert.equal(joinTextItems([{ str: "Process", hasEOL: false }, { str: "states", hasEOL: true }, { str: "New", hasEOL: true }]), "Process states\nNew\n");
  });
});
