// Upgrade and top-up prompts that report how they perform (names must match the frontend)
export const PROMPT_SURFACES = ["result-upgrade", "review-cap", "deposit-tier", "first-run", "exam-countdown", "spend-vs-pro", "ticket-ready", "library-page"] as const;
export const PROMPT_EVENTS = ["shown", "click", "dismiss"] as const;

export type PromptSurface = (typeof PROMPT_SURFACES)[number];
export type PromptEventName = (typeof PROMPT_EVENTS)[number];
