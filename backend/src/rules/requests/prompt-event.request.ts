import { z } from "zod";
import { PROMPT_EVENTS, PROMPT_SURFACES } from "../../constants/prompt-event";

export const promptEventBody = z.object({
  surface: z.enum(PROMPT_SURFACES),
  event: z.enum(PROMPT_EVENTS),
});
export type PromptEventBody = z.infer<typeof promptEventBody>;
