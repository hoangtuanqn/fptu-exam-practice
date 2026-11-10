-- Token usage per chatbot call (to watch cost and prompt-cache hits) and whether the answer hit the output limit. Additive: nullable columns and a default.
ALTER TABLE `chat_logs`
  ADD COLUMN `input_tokens` INTEGER NULL,
  ADD COLUMN `output_tokens` INTEGER NULL,
  ADD COLUMN `cache_read_tokens` INTEGER NULL,
  ADD COLUMN `truncated` BOOLEAN NOT NULL DEFAULT false;
