import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it, mock } from "node:test";
import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import type { AiConfig } from "../src/constants/ai";
import { chatAboutQuestion } from "../src/services/ai/question-chat.service";
import { explainQuestion } from "../src/services/ai/question-explainer.service";
import { plainMath } from "../src/utils/plain-math";

const USER_EXAMPLE =
  "Hàm số $f: A \\to B$ phải gán mỗi phần tử của tập A ... $\\sqrt{n}$ phải có nghĩa với mọi $n$ trong miền ... A. (i) Sai: với $n = 2$, $\\sqrt{2}$ không phải số tự nhiên nên $f$ không nhận giá trị trong $\\mathbf{N}$. ... B. (ii) Đúng: với mọi $n \\in \\mathbf{N}$ (và $n \\ge 0$), ... nên $f: \\mathbf{N} \\to \\mathbf{R}$ là một hàm. Còn $x \\notin \\mathbf{R}$.";

describe("plainMath", () => {
  it("cleans the reported MAD101 explanation", () => {
    const out = plainMath(USER_EXAMPLE);
    assert.ok(!out.includes("$"), out);
    assert.ok(!out.includes("\\"), out);
    for (const s of ["f: A → B", "√n", "n ∈ ℕ", "n ≥ 0", "f: ℕ → ℝ", "√2", "x ∉ ℝ", "n = 2"]) assert.ok(out.includes(s), `${s} in ${out}`);
    assert.equal(plainMath(out), out); // idempotent
  });

  it("handles delimiters and common commands", () => {
    assert.equal(plainMath("$$a \\le b$$"), "a ≤ b");
    assert.equal(plainMath("\\(x \\neq y\\) và \\[A \\cup B\\]"), "x ≠ y và A ∪ B");
    assert.equal(plainMath("$\\frac{a+b}{2}$ và $\\frac{1}{2}$"), "(a+b)/2 và 1/2");
    assert.equal(plainMath("$x^2 + y_1 + 2^{n+1}$"), "x² + y₁ + 2ⁿ⁺¹");
    assert.equal(plainMath("$\\sqrt{x^2+1}$ và $\\mathbb{R}$ và $\\text{ngày}$"), "√(x²+1) và ℝ và ngày");
    assert.equal(plainMath("$\\left( \\alpha \\pm \\beta \\right) \\cdot \\infty$"), "( α ± β ) · ∞");
    assert.equal(plainMath("$30^\\circ$ và $a\\,b$ và $50\\%$"), "30° và a b và 50%");
    assert.equal(plainMath("$\\foo{x}$"), "foox");
    assert.equal(plainMath("$\\mathbf{Name}$"), "Name");
  });

  it("handles nested braces", () => {
    assert.equal(plainMath("$\\frac{\\sqrt{a}}{\\frac{b}{c}}$"), "√a/(b/c)");
    assert.equal(plainMath("${{{x}}}$"), "x");
    assert.equal(plainMath("$\\sqrt{\\frac{1}{\\sqrt{2}}}$"), "√(1/√2)");
  });

  it("keeps currency and non-math text byte-identical", () => {
    for (const s of ["Giá 100$ và $5", "Mua $5 và bán $10 rồi", "từ $5-$6", "C:\\Users\\ad", "Không có toán.", "", "a $ b", "$"]) assert.equal(plainMath(s), s);
  });

  it("leaves code untouched", () => {
    const s = "Dùng `$x \\to y$` và\n```py\nprice = \"$a$\" # \\frac{1}{2}\n```\nvà $n \\ge 0$";
    assert.equal(plainMath(s), "Dùng `$x \\to y$` và\n```py\nprice = \"$a$\" # \\frac{1}{2}\n```\nvà n ≥ 0");
  });

  it("is idempotent on varied input", () => {
    for (const s of [USER_EXAMPLE, "$$\\sum_{i=1}^{n} i$$", "giá $5 và $x \\to y$", "\\to \\foo \\(a\\)", "`a` $\\mathbf{R}$"]) {
      const once = plainMath(s);
      assert.equal(plainMath(once), once, s);
    }
  });

  it("never throws or hangs on adversarial input", () => {
    const cases = [
      "$".repeat(50_000),
      "\\".repeat(50_000),
      "{".repeat(50_000),
      "$\\frac".repeat(8_000),
      "$" + "{".repeat(20_000) + "x$",
      "\\frac{".repeat(5_000),
      "`".repeat(50_000),
      "$a ".repeat(30_000),
      "x^".repeat(30_000) + "$",
      "\\(".repeat(30_000),
      "{".repeat(100) + "x" + "}".repeat(100),
    ];
    for (const s of cases) {
      const t = Date.now();
      assert.equal(typeof plainMath(s), "string");
      assert.ok(Date.now() - t < 1000, `slow: ${s.slice(0, 12)} ${Date.now() - t}ms`);
    }
  });
});

describe("explanation AI path returns sanitized text", () => {
  const config = { anthropicApiKey: "test-key", claudeModel: "stub" } as AiConfig;

  it("explainQuestion and chatAboutQuestion strip LaTeX from the model reply", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pmath-"));
    const file = path.join(dir, "q.png");
    await sharp({ create: { width: 20, height: 10, channels: 3, background: "#fff" } }).png().toFile(file);
    const text = "Vì $n \\in \\mathbf{N}$ nên $f: \\mathbf{N} \\to \\mathbf{R}$";
    // Không gọi Anthropic thật: thay đúng chỗ SDK mở luồng bằng một tin nhắn cuối giả
    const ask = mock.method(Anthropic.Messages.prototype, "stream", () => ({ finalMessage: async () => ({ usage: {}, stop_reason: "end_turn", content: [{ type: "text", text }] }) }) as never);
    try {
      const base = { examTitle: "MAD101 - FA25 - FE", subjectCode: "MAD101", subjectName: null, questionNumber: 13, imageFile: file, correctAnswer: "B" };
      assert.equal(await explainQuestion(config, base), "Vì n ∈ ℕ nên f: ℕ → ℝ");
      const reply = await chatAboutQuestion(config, { ...base, explanation: "Vì $n \\ge 0$", messages: [{ role: "user", content: "tại sao?" }] });
      assert.equal(reply, "Vì n ∈ ℕ nên f: ℕ → ℝ");
      const sent = JSON.stringify((ask.mock.calls[1]!.arguments as unknown[])[0]);
      assert.ok(sent.includes("Vì n ≥ 0") && !sent.includes("\\\\ge"), "stored explanation is cleaned before being sent back to the model");
    } finally {
      ask.mock.restore();
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
