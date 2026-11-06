import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../configs/prisma";
import { aiReady } from "../constants/ai";
import { CHAT_CANNED, CHAT_MAX_OUTPUT_TOKENS, CHAT_MAX_TOOL_TURNS, CHAT_MAX_TURNS, CHAT_MONEY_HINT, CHAT_OLD_REPLY_CHARS, CHAT_SYSTEM_PROMPT } from "../constants/chat";
import { HTTP_STATUS } from "../constants/httpStatus";
import { PE_PRICE } from "../constants/pe";
import { activePromoEnd, promoExpired } from "../constants/promo";
import { ANSWER_REPORT_REWARD } from "../constants/report";
import { AppError } from "../rules/error";
import type { ChatBody } from "../rules/requests/chat.request";
import type { Owner } from "../utils/actor";
import { startOfVnDay } from "../utils/time";
import { accountSettingService } from "./account-setting.service";
import { aiSettingService } from "./ai-setting.service";
import { chatSettingService } from "./chat-setting.service";
import { crawlerSettingService } from "./crawler-setting.service";
import { CHAT_TOOLS, toolStatus, runChatTool } from "./chat-tools.service";
import { chatCacheService, type Viewer } from "./chat-cache.service";
import { knowledgeService } from "./knowledge.service";
import { promoSettingService } from "./promo-setting.service";
import { settingService } from "./setting.service";

const nf = new Intl.NumberFormat("vi-VN");

// Các con số admin có thể đổi: lấy hiện hành để chatbot không nói giá cũ; nhớ 60 giây để không truy vấn cấu hình mỗi lượt
let factsCache: { at: number; text: string } | null = null;
async function liveFacts() {
  if (factsCache && Date.now() - factsCache.at < 60_000) return factsCache.text;
  const [crawler, ai, promo, account, sepay] = await Promise.all([
    crawlerSettingService.get(),
    aiSettingService.get(),
    promoSettingService.get(),
    accountSettingService.get(),
    settingService.getSepay(),
  ]);
  const ends = activePromoEnd(promo);
  const lines = [
    `Phí lấy một đề từ FuOverflow (thành viên): ${crawler.fetchPrice > 0 ? `${nf.format(crawler.fetchPrice)} credit` : "miễn phí"}.`,
    `Giải thích AI một câu: ${ai.explainPrice > 0 ? `${nf.format(ai.explainPrice)} credit` : "miễn phí"}; mỗi tài khoản có ${ai.explainPrice > 0 ? promo.freeTrials : 0} lượt xem thử miễn phí.`,
    `Gói mở khóa toàn bộ lời giải một đề: giảm ${promoExpired(promo) ? 0 : promo.bundleDiscountPercent}% so với mua lẻ${ends ? ` (ưu đãi đến ${ends.toLocaleDateString("vi-VN")})` : ""}.`,
    `Tải đề PE: ${nf.format(PE_PRICE)} credit mỗi đề, trả một lần, tải lại miễn phí.`,
    `Mức nạp tối thiểu: ${nf.format(sepay.minDeposit)} ₫ (1 ₫ = 1 credit).`,
    promo.depositBonusTiers.length ? `Thưởng khi nạp: ${promo.depositBonusTiers.map((t) => `từ ${nf.format(t.min)} ₫ thưởng thêm ${t.percent}%`).join("; ")}.` : "Hiện không có thưởng khi nạp.",
    account.signupCredit > 0 ? `Tặng ${nf.format(account.signupCredit)} credit khi đăng ký tài khoản mới.` : "Không tặng credit khi đăng ký.",
    `Báo cáo đáp án đúng được thưởng ${nf.format(ANSWER_REPORT_REWARD)} credit.`,
  ];
  factsCache = { at: Date.now(), text: lines.join("\n") };
  return factsCache.text;
}

export const chatService = {
  async status() {
    const c = await chatSettingService.get();
    const ai = await aiSettingService.get();
    return { enabled: c.enabled && aiReady(ai) };
  },

  /**
   * Việc chung trước khi hỏi Claude (cả kiểu trả một lần lẫn stream): kiểm tra bật/tắt và giới hạn ngày, tìm đoạn hướng dẫn,
   * ghi nhận lượt hỏi. Mọi lỗi ném ra ở đây xảy ra TRƯỚC khi gửi byte nào cho người dùng nên vẫn trả được mã lỗi HTTP đúng.
   */
  async prepare(owner: Owner, ip: string | undefined, { messages }: ChatBody) {
    const [config, ai] = await Promise.all([chatSettingService.get(), aiSettingService.get()]);
    if (!config.enabled || !aiReady(ai)) throw new AppError("Cóc Pass tạm nghỉ chút, bạn quay lại sau nhé", HTTP_STATUS.SERVICE_UNAVAILABLE);

    // Câu trả lời cũ của Cóc Pass chỉ cần đủ ngữ cảnh: cắt ngắn (câu hỏi của người dùng giữ nguyên)
    const history = messages.slice(-CHAT_MAX_TURNS).map((m, i, all) => (m.role === "assistant" && i < all.length - 1 && m.content.length > CHAT_OLD_REPLY_CHARS ? { ...m, content: `${m.content.slice(0, CHAT_OLD_REPLY_CHARS)}…` } : m));
    while (history[0] && history[0].role !== "user") history.shift(); // phải bắt đầu bằng tin của người dùng
    const question = history[history.length - 1]!.content;
    // Câu hỏi nối tiếp ngắn ("còn giá thì sao?") tìm kèm câu hỏi trước đó của người dùng để đúng ngữ cảnh
    const prevUser = [...history].reverse().find((m, i) => i > 0 && m.role === "user")?.content ?? "";
    const query = question.length < 50 && prevUser ? `${prevUser}\n${question}` : question;

    const [hits, facts] = await Promise.all([knowledgeService.search(query), CHAT_MONEY_HINT.test(query) ? liveFacts() : Promise.resolve("")]);
    const knowledge = hits.length ? hits.map((h) => `### ${h.title}\n${h.content}`).join("\n\n") : "(Không có đoạn hướng dẫn nào khớp với câu hỏi này.)";

    const log = await prisma.chatLog.create({
      data: { userId: "userId" in owner ? owner.userId : null, guestId: "guestId" in owner ? owner.guestId : null, ip: ip?.slice(0, 64) ?? null, question: question.slice(0, 500), matched: hits.length > 0 },
      select: { id: true },
    });

    return {
      logId: log.id,
      matched: hits.length > 0,
      userId: "userId" in owner ? owner.userId : null,
      request: {
        client: new Anthropic({ apiKey: ai.anthropicApiKey, timeout: 45_000, maxRetries: 1 }),
        params: {
          model: config.claudeModel,
          max_tokens: CHAT_MAX_OUTPUT_TOKENS,
          system: [
            { type: "text" as const, text: CHAT_SYSTEM_PROMPT },
            { type: "text" as const, text: `<viewer>${"userId" in owner ? "logged_in" : "guest"}</viewer>${facts ? `
<live_facts>
${facts}
</live_facts>` : ""}
<knowledge>\n${knowledge}\n</knowledge>` },
          ],
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        },
      },
    };
  },

  // Lỗi phía hệ thống thì không tính vào lượt hỏi của người dùng
  async refund(logId: number, err: unknown) {
    await prisma.chatLog.delete({ where: { id: logId } }).catch(() => undefined);
    console.error(`[chat] lỗi gọi Claude: ${(err as Error).message}`);
  },

  /**
   * Trả lời dạng stream: mỗi đoạn chữ Claude sinh ra được đẩy ngay cho người dùng (onDelta).
   * Thành viên có công cụ tra cứu dữ liệu của chính họ: khi Claude gọi công cụ (stop_reason = tool_use) máy chủ chạy công cụ,
   * trả kết quả lại và Claude viết tiếp, tối đa CHAT_MAX_TOOL_TURNS vòng. `signal` huỷ khi người dùng đóng khung chat giữa chừng.
   */
  async stream(owner: Owner, ip: string | undefined, body: ChatBody, h: { onStart: () => void; onDelta: (text: string) => void; onStatus: (text: string) => void; signal: AbortSignal }) {
    const last = body.messages[body.messages.length - 1]!.content.trim();
    const canned = body.messages.length <= 2 ? CHAT_CANNED.find((c) => c.match.test(last)) : undefined;
    if (canned) {
      if (!(await chatSettingService.get()).enabled) throw new AppError("Cóc Pass tạm nghỉ chút, bạn quay lại sau nhé", HTTP_STATUS.SERVICE_UNAVAILABLE);
      h.onStart();
      h.onDelta(canned.reply);
      return {};
    }

    // Cache: câu hỏi hướng dẫn chung đứng riêng mà đã từng được trả lời (cùng ý) thì trả lại luôn, không gọi Claude
    const viewer: Viewer = "userId" in owner ? "member" : "guest";
    const question = body.messages[body.messages.length - 1]!.content;
    const cacheable = chatCacheService.eligible(body.messages.filter((m, i) => !(i === 0 && m.role !== "user")).length, question);
    const vec = cacheable ? await knowledgeService.queryVector(question) : null;
    if (vec) {
      const cached = await chatCacheService.find(vec, viewer);
      if (cached) {
        const status = await this.status();
        if (!status.enabled) throw new AppError("Cóc Pass tạm nghỉ chút, bạn quay lại sau nhé", HTTP_STATUS.SERVICE_UNAVAILABLE);
        await prisma.chatLog.create({
          data: { userId: "userId" in owner ? owner.userId : null, guestId: "guestId" in owner ? owner.guestId : null, ip: ip?.slice(0, 64) ?? null, question: question.slice(0, 500), matched: true, cached: true },
        });
        h.onStart();
        // Chảy chữ từng đoạn ngắn như khi Claude trả lời thật
        for (const piece of cached.match(/\S+\s*/g) ?? [cached]) {
          if (h.signal.aborted) return { aborted: true as const };
          h.onDelta(piece);
          await new Promise((r) => setTimeout(r, 12));
        }
        return {};
      }
    }

    const { logId, userId, request, matched } = await this.prepare(owner, ip, body);
    h.onStart(); // từ đây đã gửi header, lỗi sau này báo bằng sự kiện trong luồng
    let answer = ""; // toàn bộ câu trả lời, để lưu vào cache
    let usedTools = false;
    const messages: Anthropic.MessageParam[] = [...request.params.messages];
    const emit = h.onDelta;
    h = { ...h, onDelta: (t: string) => ((answer += t), emit(t)) };
    const tools = userId !== null ? CHAT_TOOLS : undefined;
    let produced = false;
    let separate = false; // sau một vòng công cụ, đoạn chữ mới cách đoạn trước một dòng trống
    try {
      for (let turn = 0; turn <= CHAT_MAX_TOOL_TURNS; turn++) {
        const stream = request.client.messages.stream({ ...request.params, messages, ...(tools && { tools }) });
        h.signal.addEventListener("abort", () => stream.abort(), { once: true });
        stream.on("text", (t) => {
          if (separate) {
            h.onDelta("\n\n");
            separate = false;
          }
          produced = true;
          h.onDelta(t);
        });
        const final = await stream.finalMessage();

        if (final.stop_reason === "tool_use" && tools && userId !== null && turn < CHAT_MAX_TOOL_TURNS) {
          usedTools = true;
          const calls = final.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
          messages.push({ role: "assistant", content: final.content });
          const results: Anthropic.ToolResultBlockParam[] = [];
          for (const c of calls) {
            h.onStatus(toolStatus(c.input));
            results.push({ type: "tool_result", tool_use_id: c.id, content: await runChatTool(userId, c.name, c.input) });
          }
          messages.push({ role: "user", content: results });
          separate = produced;
          continue;
        }
        if (final.stop_reason === "refusal" || !produced) throw new Error("empty");
        // Chỉ lưu khi trả lời trọn vẹn, có dựa vào tài liệu và không đụng đến dữ liệu tài khoản
        if (vec && matched && !usedTools && final.stop_reason === "end_turn") void chatCacheService.save(vec, viewer, question, answer);
        return {};
      }
      throw new Error("quá nhiều vòng tra cứu");
    } catch (err) {
      if (h.signal.aborted) return { aborted: true as const }; // người dùng tự đóng
      await this.refund(logId, err);
      throw new AppError("Mình đang bận chút, bạn thử lại sau ít phút nhé", HTTP_STATUS.SERVICE_UNAVAILABLE);
    }
  },

  // Thống kê cho admin: lượng hỏi và các câu hỏi chưa có tài liệu (để bổ sung vào hướng dẫn)
  async adminStats() {
    const since = startOfVnDay();
    const [today, total, unmatched] = await Promise.all([
      prisma.chatLog.count({ where: { createdAt: { gte: since } } }),
      prisma.chatLog.count(),
      prisma.chatLog.findMany({ where: { matched: false }, orderBy: { id: "desc" }, take: 15, select: { question: true, createdAt: true } }),
    ]);
    return { today, total, unmatched };
  },
};
