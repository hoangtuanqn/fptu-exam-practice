import { http } from "@/shared/api/client";

export type PromptSurface = "result-upgrade" | "review-cap" | "deposit-tier" | "first-run" | "exam-countdown" | "spend-vs-pro" | "ticket-ready" | "library-page";
export type PromptEvent = "shown" | "click" | "dismiss";

// Report that an upgrade/top-up prompt was shown, clicked or dismissed. Fire and forget: a failure must never affect the user.
export const trackPrompt = (surface: PromptSurface, event: PromptEvent) => {
  http.post("/events/prompt", { surface, event }).catch(() => undefined);
};
