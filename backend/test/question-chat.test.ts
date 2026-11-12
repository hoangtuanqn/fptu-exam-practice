import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import sharp from "sharp";
import { buildSystem, DEFAULT_MODULE, hasModule } from "../src/prompts";
import { trimHistory, type ChatMessage } from "../src/services/ai/question-chat.service";
import { questionContextBlocks } from "../src/services/ai/question-explainer.service";

const msg = (role: ChatMessage["role"], content: string): ChatMessage => ({ role, content });

describe("question chat", () => {
  it("trimHistory keeps the last N messages and starts with a user turn", () => {
    const all = Array.from({ length: 13 }, (_, i) => msg(i % 2 === 0 ? "user" : "assistant", `m${i}`));
    const out = trimHistory(all, 10);
    assert.equal(out[0]!.role, "user");
    assert.equal(out.at(-1)!.content, "m12");
    assert.ok(out.length <= 10);
    assert.deepEqual(trimHistory([msg("assistant", "a")], 10), []);
  });

  it("loads the chat-explain prompt and the PFP191 explain module", () => {
    const system = buildSystem("chat-explain", DEFAULT_MODULE);
    assert.equal(system.length, 1);
    assert.match(system[0]!.text, /<subject_rules>/);
    assert.ok(hasModule("explain", "PFP191"));
  });

  it("question context names the subject and is byte-identical between calls (prompt cache prefix)", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "qchat-"));
    const file = path.join(dir, "q.png");
    await sharp({ create: { width: 20, height: 10, channels: 3, background: "#fff" } }).png().toFile(file);
    const input = { examTitle: "PFP191 - SU26 - FE", subjectCode: "PFP191", subjectName: "Programming Fundamentals with Python", questionNumber: 3, imageFile: file, correctAnswer: "B" };
    const a = await questionContextBlocks(input);
    const b = await questionContextBlocks(input);
    assert.equal(JSON.stringify(a), JSON.stringify(b));
    assert.match(JSON.stringify(a[0]), /Subject: PFP191 - Programming Fundamentals with Python/);
    await fs.rm(dir, { recursive: true, force: true });
  });
});
