-- Email marketing preference center: per-topic mute bitmask (review=1, offers=2, renewal=4, news=8) and a temporary pause.
-- Additive: two columns with a default / nullable. No change to existing data.
ALTER TABLE `users`
    ADD COLUMN `marketing_muted_topics` INT NOT NULL DEFAULT 0,
    ADD COLUMN `marketing_muted_until` DATETIME(3) NULL;
