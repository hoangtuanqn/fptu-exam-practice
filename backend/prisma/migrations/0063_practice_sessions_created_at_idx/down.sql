-- Manual rollback of 0063 (Prisma ignores this file).
DROP INDEX `practice_sessions_created_at_idx` ON `practice_sessions`;
