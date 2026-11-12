-- Admin insights count practice sessions by created_at; without this index each count scans the whole table.
-- Additive: index only, no data change.
CREATE INDEX `practice_sessions_created_at_idx` ON `practice_sessions`(`created_at`);
