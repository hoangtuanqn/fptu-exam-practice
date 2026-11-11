-- Manual rollback of 0057 (Prisma ignores this file). Roll back 0058 first if it was applied.
DROP TABLE IF EXISTS `question_embeddings`;
