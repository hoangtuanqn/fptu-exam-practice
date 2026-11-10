-- Embeddings moved from Gemini to OpenAI: drop the stored Gemini key and clear vectors made by Gemini (vectors from different models cannot be compared).
-- Data-only migration, no schema change. Chunk text is kept; vectors are recreated with the new model.
DELETE FROM `settings` WHERE `key` = 'chat.geminiApiKey';
UPDATE `kb_chunks` SET `embedding` = NULL, `model` = NULL WHERE `model` LIKE 'gemini%';
UPDATE `subject_chunks` SET `embedding` = NULL, `model` = NULL WHERE `model` LIKE 'gemini%';
