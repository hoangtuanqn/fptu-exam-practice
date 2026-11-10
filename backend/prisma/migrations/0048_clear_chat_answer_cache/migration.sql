-- chat_answer_cache stores question vectors; the old ones were made by Gemini and cannot be compared with OpenAI vectors.
-- It is only a cache of answers (rebuilt on demand), so clear it. Data-only migration, no schema change.
DELETE FROM `chat_answer_cache`;
