import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { prisma } from "../src/configs/prisma";
import type { AiConfig } from "../src/constants/ai";
import { CHAT_DEFAULTS, CHAT_LIMITS, CHAT_MAX_INPUT_CHARS, chatProviderReady, type ChatConfig } from "../src/constants/chat";
import { settingRepository } from "../src/repositories/setting.repository";
import { updateChatSettingsBody } from "../src/rules/requests/chat.request";
import { aiSettingService } from "../src/services/ai-setting.service";
import { createSseParser, streamResponses } from "../src/services/ai/chat-openai.client";
import { chatQuotaService } from "../src/services/chat-quota.service";
import { chatSettingService } from "../src/services/chat-setting.service";
import { chatService } from "../src/services/chat.service";
import { knowledgeService } from "../src/services/knowledge.service";
import { parseExtraHeader } from "../src/utils/http-header";

// Giá trị giả, không phải endpoint/khoá thật
const KEY = "sk-test-SECRET-1234";
const HEADER_VALUE = "hdr-SECRET-val";
const OPENAI: ChatConfig = { ...CHAT_DEFAULTS, chatProvider: "openai", chatBaseUrl: "https://llm.example.test/v1", chatModel: "test-model", chatApiKey: KEY, chatExtraHeader: `X-Test-Tag: ${HEADER_VALUE}` };
const AI = { enabled: true, anthropicApiKey: "ak-test" } as AiConfig;

// Stream SSE cắt theo byte (cả giữa ký tự có dấu) để thử bộ đọc với sự kiện bị chia ngang chunk
function sse(events: object[], size = 7) {
  const bytes = new TextEncoder().encode(events.map((e) => `event: ${(e as { type: string }).type}\r\ndata: ${JSON.stringify(e)}\r\n\r\n`).join(""));
  return new Response(
    new ReadableStream({
      start(c) {
        for (let i = 0; i < bytes.length; i += size) c.enqueue(bytes.slice(i, i + size));
        c.close();
      },
    }),
    { status: 200, headers: { "content-type": "text/event-stream" } },
  );
}
const usage = { input_tokens: 100, output_tokens: 20, input_tokens_details: { cached_tokens: 40 } };
const textTurn = (text: string) => [
  { type: "response.created", response: {} },
  { type: "response.output_text.delta", delta: text.slice(0, 3) },
  { type: "response.output_text.delta", delta: text.slice(3) },
  { type: "some.unknown.event", x: 1 },
  { type: "response.completed", response: { status: "completed", output: [{ type: "message", content: [{ type: "output_text", text }] }], usage } },
];
const toolTurn = [
  { type: "response.output_item.done", item: { type: "function_call", call_id: "call_1", name: "recent_exams", arguments: '{"subject":"!!"}' } },
  { type: "response.completed", response: { status: "completed", output: [{ type: "function_call", call_id: "call_1", name: "recent_exams", arguments: '{"subject":"!!"}' }], usage } },
];

describe("SSE parser", () => {
  it("joins events split across chunks and ignores comments", () => {
    const got: string[] = [];
    const p = createSseParser((d) => got.push(d));
    for (const c of [": ping\n\nda", "ta: {\"a\":", "1}\r", "\n\r\ndata: x\ndata: y\n", "\n", "data: tail"]) p.push(c);
    p.end();
    assert.deepEqual(got, ['{"a":1}', "x\ny", "tail"]);
  });
});

describe("extra header and settings validation", () => {
  it("parses one safe header and rejects bad or reserved ones", () => {
    assert.deepEqual(parseExtraHeader("X-Tag: abc"), ["X-Tag", "abc"]);
    assert.equal(parseExtraHeader("Bad Name: x"), null);
    assert.equal(parseExtraHeader("X-Tag: a\r\nX-Evil: b"), null);
    assert.equal(parseExtraHeader("Authorization: Bearer x"), null);
    for (const name of ["Keep-Alive", "upgrade", "Expect", "TE", "Proxy-Authorization", "Transfer-Encoding"]) assert.equal(parseExtraHeader(`${name}: x`), null, name);
    assert.equal(parseExtraHeader("X-Tag: café"), null); // non-ASCII value
    assert.equal(parseExtraHeader("X-Tag: ab"), null); // control char
    assert.deepEqual(parseExtraHeader("X-Tag: a	b ~!"), ["X-Tag", "a	b ~!"]);
  });
  it("accepts only https base URLs without credentials and trims the trailing slash", () => {
    assert.equal(updateChatSettingsBody.parse({ chatBaseUrl: "https://llm.example.test/v1/" }).chatBaseUrl, "https://llm.example.test/v1");
    assert.equal(updateChatSettingsBody.parse({ chatBaseUrl: "" }).chatBaseUrl, "");
    for (const bad of ["http://llm.example.test/v1", "https://u:p@llm.example.test/v1", "https://llm.example.test/v1?k=1", "https://llm.example.test/v1?", "https://llm.example.test/v1#", "https://llm.example.test/v1#x", "nota url"]) assert.equal(updateChatSettingsBody.safeParse({ chatBaseUrl: bad }).success, false, bad);
    assert.equal(updateChatSettingsBody.safeParse({ chatExtraHeader: "no colon" }).success, false);
    assert.equal(updateChatSettingsBody.safeParse({ chatProvider: "other" }).success, false);
    for (const badKey of ["sk test", "sk-é", "sk-	tab"]) assert.equal(updateChatSettingsBody.safeParse({ chatApiKey: badKey }).success, false, badKey);
    assert.equal(updateChatSettingsBody.parse({ chatApiKey: "" }).chatApiKey, "");
    assert.equal(updateChatSettingsBody.parse({ chatApiKey: "sk-ABC_123.~" }).chatApiKey, "sk-ABC_123.~");
  });
});

describe("chat provider readiness", () => {
  it("needs base URL, model and key for openai and the AI config for anthropic", () => {
    assert.equal(chatProviderReady(OPENAI, { ...AI, enabled: false }), true);
    assert.equal(chatProviderReady({ ...OPENAI, chatApiKey: "" }, AI), false);
    assert.equal(chatProviderReady({ ...OPENAI, chatModel: "" }, AI), false);
    assert.equal(chatProviderReady(CHAT_DEFAULTS, AI), true);
    assert.equal(chatProviderReady(CHAT_DEFAULTS, { ...AI, anthropicApiKey: "" }), false);
  });
});

describe("chat limits per provider", () => {
  it("keeps the original limits for anthropic and raises them only for openai", () => {
    assert.deepEqual(CHAT_LIMITS.anthropic, { maxTurns: 6, oldReplyChars: 400, maxInputChars: 800, guestBatch: 10, memberBatch: 20, maxOutputTokens: 4000, maxToolTurns: 4 });
    assert.deepEqual(CHAT_LIMITS.openai, { maxTurns: 20, oldReplyChars: 1500, maxInputChars: 4000, guestBatch: 100, memberBatch: 500, maxOutputTokens: 16000, maxToolTurns: 8 });
    assert.equal(CHAT_MAX_INPUT_CHARS, 4000); // schema stays permissive at the raised ceiling
  });
});

describe("chat settings key handling", () => {
  let store: Record<string, string>;
  beforeEach(() => {
    store = { "chat.chatApiKey": KEY, "chat.chatProvider": "openai", "chat.chatBaseUrl": OPENAI.chatBaseUrl, "chat.chatModel": "m1" };
    mock.method(settingRepository, "getMany", async (keys: string[]) => Object.fromEntries(keys.filter((k) => k in store).map((k) => [k, store[k]])));
    mock.method(settingRepository, "setMany", async (e: Record<string, string>) => void Object.assign(store, e));
  });
  afterEach(() => mock.restoreAll());

  it("never returns the key, only a preview", async () => {
    const s = await chatSettingService.getForAdmin();
    assert.ok(!JSON.stringify(s).includes(KEY));
    assert.equal(s.hasChatKey, true);
    assert.equal(s.chatKeyPreview, "••••1234");
    assert.equal(s.chatProvider, "openai");
  });
  it("keeps the old key on empty input and clears it on request", async () => {
    await chatSettingService.update({ chatApiKey: "", chatModel: "m2" });
    assert.equal(store["chat.chatApiKey"], KEY);
    assert.equal(store["chat.chatModel"], "m2");
    const s = await chatSettingService.update({ clearChatKey: true, chatProvider: "anthropic" });
    assert.equal(s.hasChatKey, false);
    assert.equal(store["chat.chatApiKey"], "");
  });
  it("refuses to switch to openai while the key would be empty (URL, model and header have defaults), but always allows anthropic", async () => {
    await assert.rejects(chatSettingService.update({ clearChatKey: true }), (err: Error & { status?: number; errors?: Record<string, string> }) => {
      assert.equal(err.status, 400);
      assert.match(err.message, /Khóa API trước khi bật nguồn này/);
      assert.deepEqual(Object.keys(err.errors ?? {}), ["chatApiKey"]);
      return true;
    });
    assert.equal(store["chat.chatApiKey"], KEY); // nothing saved
    store = {};
    await assert.rejects(chatSettingService.update({ chatProvider: "openai", chatModel: "m" }), /Khóa API trước khi bật nguồn này/);
    store = {};
    await chatSettingService.update({ chatProvider: "openai", chatApiKey: KEY }); // only the key is needed
    assert.equal((await chatSettingService.get()).chatModel, CHAT_DEFAULTS.chatModel);
    store = {};
    await chatSettingService.update({ chatProvider: "openai", chatBaseUrl: OPENAI.chatBaseUrl, chatModel: "m", chatApiKey: KEY });
    assert.equal(store["chat.chatProvider"], "openai");
    await chatSettingService.update({ chatProvider: "anthropic", clearChatKey: true, chatBaseUrl: "" });
    assert.equal(store["chat.chatProvider"], "anthropic");
  });
  it("falls back to anthropic on an unknown stored provider", async () => {
    store["chat.chatProvider"] = "weird";
    assert.equal((await chatSettingService.get()).chatProvider, "anthropic");
  });
});

describe("chat stream through an OpenAI-compatible endpoint", () => {
  const original = Object.getOwnPropertyDescriptor(prisma, "chatLog");
  let calls: { url: string; init: RequestInit }[];
  let deleted: number[];
  let updated: Record<string, unknown>[];
  let replies: (() => Response | Promise<Response>)[];
  let quota: unknown[];

  beforeEach(() => {
    calls = [];
    deleted = [];
    updated = [];
    replies = [];
    Object.defineProperty(prisma, "chatLog", {
      value: { create: async () => ({ id: 42 }), update: async (a: { data: Record<string, unknown> }) => void updated.push(a.data), delete: async (a: { where: { id: number } }) => void deleted.push(a.where.id) },
      configurable: true,
    });
    mock.method(chatSettingService, "get", async () => OPENAI);
    mock.method(aiSettingService, "get", async () => AI);
    quota = [];
    mock.method(chatQuotaService, "check", async (...a: unknown[]) => void quota.push(a[3]));
    mock.method(knowledgeService, "search", async () => []);
    mock.method(knowledgeService, "queryVector", async () => null);
    mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      const next = replies.shift();
      if (!next) throw new Error("no reply");
      return next();
    });
  });
  afterEach(() => {
    mock.restoreAll();
    if (original) Object.defineProperty(prisma, "chatLog", original);
    else delete (prisma as unknown as Record<string, unknown>).chatLog;
  });

  const run = async (question = "Làm sao đổi mật khẩu?") => {
    const deltas: string[] = [];
    const statuses: string[] = [];
    const out = await chatService.stream({ guestId: "g1" }, "1.1.1.1", { messages: [{ role: "user", content: question }] }, { onStart: () => undefined, onDelta: (t) => deltas.push(t), onStatus: (t) => statuses.push(t), signal: new AbortController().signal });
    return { out, text: deltas.join(""), statuses };
  };

  it("runs the tool loop and streams the final text", async () => {
    replies.push(() => sse(toolTurn), () => sse(textTurn("Chào bạn, đây là câu trả lời")));
    const { out, text, statuses } = await run();
    assert.deepEqual(out, {});
    assert.equal(text, "Chào bạn, đây là câu trả lời");
    assert.equal(statuses.length, 1);
    assert.equal(calls.length, 2);
    assert.equal(calls[0]!.url, "https://llm.example.test/v1/responses");
    const headers = calls[0]!.init.headers as Record<string, string>;
    assert.equal(headers.Authorization, `Bearer ${KEY}`);
    assert.equal(headers["X-Test-Tag"], HEADER_VALUE);
    const first = JSON.parse(String(calls[0]!.init.body));
    assert.equal(first.stream, true);
    assert.equal(first.store, false);
    assert.equal(first.model, "test-model");
    assert.equal(first.max_output_tokens, 16000);
    assert.deepEqual(quota, ["openai"]);
    assert.ok(first.instructions.includes("Cóc Pass") && first.instructions.includes("<viewer>guest</viewer>"));
    assert.deepEqual(first.tools.map((t: { type: string; name: string }) => `${t.type}:${t.name}`), ["function:recent_exams"]);
    const second = JSON.parse(String(calls[1]!.init.body));
    const items = second.input as { type?: string; call_id?: string; output?: string }[];
    assert.ok(items.some((i) => i.type === "function_call" && i.call_id === "call_1"));
    const result = items.find((i) => i.type === "function_call_output");
    assert.equal(result?.call_id, "call_1");
    assert.ok(JSON.parse(result!.output!).error); // mã môn sai: công cụ trả lỗi trước khi chạm DB
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(updated[0], { inputTokens: 120, outputTokens: 40, cacheReadTokens: 80, truncated: false });
  });

  it("continues once after max_output_tokens", async () => {
    replies.push(
      () => sse([{ type: "response.output_text.delta", delta: "Phần đầu" }, { type: "response.incomplete", response: { status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, usage } }]),
      () => sse(textTurn(" phần sau")),
    );
    const { text } = await run();
    assert.equal(text, "Phần đầu phần sau");
    const second = JSON.parse(String(calls[1]!.init.body));
    assert.deepEqual(second.input.slice(-2).map((i: { role: string }) => i.role), ["assistant", "user"]);
  });

  it("refunds and hides the key and header on upstream failure", async () => {
    replies.push(() => new Response(JSON.stringify({ error: { message: `bad key ${KEY}` } }), { status: 401 }));
    const logs: string[] = [];
    mock.method(console, "error", (...a: unknown[]) => void logs.push(a.join(" ")));
    mock.method(console, "log", (...a: unknown[]) => void logs.push(a.join(" ")));
    await assert.rejects(run(), (err: Error) => {
      assert.equal(err.message, "Mình đang bận chút, bạn thử lại sau ít phút nhé");
      return true;
    });
    assert.deepEqual(deleted, [42]);
    const all = logs.join("\n");
    assert.ok(all.includes("401"));
    for (const secret of [KEY, HEADER_VALUE, "Làm sao"]) assert.ok(!all.includes(secret), secret);
  });

  it("reports an in-stream failure event as an error without the server message", async () => {
    replies.push(() => sse([{ type: "response.failed", response: { error: { code: "server_error", message: `leak ${KEY}` } } }]));
    await assert.rejects(streamResponses({ baseUrl: OPENAI.chatBaseUrl, model: "m", apiKey: KEY, extraHeader: "" }, {}, new AbortController().signal, () => undefined), (err: Error) => {
      assert.equal(err.message, "chat upstream failed server_error");
      return true;
    });
  });

  it("never treats response.incomplete as completed, even without a status", async () => {
    replies.push(() => sse([{ type: "response.output_text.delta", delta: "x" }, { type: "response.incomplete", response: { incomplete_details: { reason: "content_filter" } } }]));
    const out = await streamResponses({ baseUrl: OPENAI.chatBaseUrl, model: "m", apiKey: KEY, extraHeader: "" }, {}, new AbortController().signal, () => undefined);
    assert.equal(out.status, "incomplete");
    assert.equal(out.incompleteReason, "content_filter");
  });

  it("exposes the active provider limits in status()", async () => {
    assert.deepEqual(await chatService.status(), { enabled: true, maxInputChars: 4000, maxTurns: 20 });
    mock.method(chatSettingService, "get", async () => CHAT_DEFAULTS);
    assert.deepEqual(await chatService.status(), { enabled: true, maxInputChars: 800, maxTurns: 6 });
  });

  it("returns aborted when the user closes the chat", async () => {
    const ac = new AbortController();
    replies.push(() => {
      ac.abort();
      throw new DOMException("aborted", "AbortError");
    });
    const out = await chatService.stream({ guestId: "g1" }, undefined, { messages: [{ role: "user", content: "Làm sao đổi mật khẩu?" }] }, { onStart: () => undefined, onDelta: () => undefined, onStatus: () => undefined, signal: ac.signal });
    assert.deepEqual(out, { aborted: true });
  });

  it("accepts a long question for openai but rejects it for anthropic before any model call or quota", async () => {
    const long = "Làm sao đổi mật khẩu? ".repeat(40).slice(0, 801);
    replies.push(() => sse(textTurn("ok bạn")));
    assert.equal((await run(long)).text, "ok bạn");
    mock.method(chatSettingService, "get", async () => CHAT_DEFAULTS);
    quota = [];
    await assert.rejects(run(long), (err: Error & { status?: number }) => {
      assert.equal(err.message, "Câu hỏi tối đa 800 ký tự");
      assert.equal(err.status, 400);
      return true;
    });
    assert.deepEqual(quota, []);
    assert.equal(calls.length, 1);
  });

  it("keeps the anthropic request unchanged when the provider is anthropic", async () => {
    mock.restoreAll();
    mock.method(chatSettingService, "get", async () => CHAT_DEFAULTS);
    mock.method(aiSettingService, "get", async () => AI);
    mock.method(knowledgeService, "search", async () => []);
    const prep = await chatService.prepare({ userId: 7 }, undefined, { messages: [{ role: "user", content: "Làm sao đổi mật khẩu?" }] });
    assert.equal(prep.openai, null);
    assert.equal(prep.request!.params.model, CHAT_DEFAULTS.claudeModel);
    assert.equal(prep.request!.params.system[1]!.text, "<viewer>logged_in</viewer>\n<knowledge>\n(Không có đoạn hướng dẫn nào khớp với câu hỏi này.)\n</knowledge>");
    assert.deepEqual(prep.request!.params.messages, [{ role: "user", content: "Làm sao đổi mật khẩu?" }]);
    assert.equal(prep.request!.params.max_tokens, 4000);
    // 6 tin gần nhất, câu trả lời cũ cắt còn 400 ký tự
    const many = Array.from({ length: 9 }, (_, i) => ({ role: (i % 2 ? "assistant" : "user") as "user" | "assistant", content: i % 2 ? "x".repeat(1000) : `câu ${i}` }));
    const p2 = await chatService.prepare({ userId: 7 }, undefined, { messages: many });
    const sent = p2.request!.params.messages;
    assert.equal(sent.length, 5); // 6 tin cuối bắt đầu bằng trả lời nên bỏ tin đầu
    assert.equal(sent[1]!.content.length, 401);
    assert.equal(calls.length, 0);
  });
});
