import { PROMPT_EVENTS, PROMPT_SURFACES } from "../constants/prompt-event";
import { promptEventRepository } from "../repositories/prompt-event.repository";
import type { PromptEventBody } from "../rules/requests/prompt-event.request";
import { DAY_MS } from "../utils/time";

export const promptEventService = {
  async record(userId: number, body: PromptEventBody) {
    await promptEventRepository.create(userId, body.surface, body.event);
  },

  // Per prompt: shown / click / dismiss and the click rate. The client caps each prompt per user, so rows are close to users.
  async summary(days: number) {
    const rows = await promptEventRepository.countSince(new Date(Date.now() - days * DAY_MS));
    const n = (surface: string, event: string) => rows.find((r) => r.surface === surface && r.event === event)?._count._all ?? 0;
    return {
      days,
      prompts: PROMPT_SURFACES.map((surface) => {
        const counts = Object.fromEntries(PROMPT_EVENTS.map((e) => [e, n(surface, e)])) as Record<(typeof PROMPT_EVENTS)[number], number>;
        return { surface, ...counts, clickRate: counts.shown > 0 ? counts.click / counts.shown : null };
      }),
    };
  },
};
