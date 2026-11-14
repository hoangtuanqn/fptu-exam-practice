-- Email marketing measurement: CTA target and click/return markers on campaign logs, index for per-campaign time ranges.
-- Additive: three nullable columns and one index. No change to existing data.
ALTER TABLE `email_campaign_logs`
    ADD COLUMN `target` VARCHAR(120) NULL,
    ADD COLUMN `clicked_at` DATETIME(3) NULL,
    ADD COLUMN `returned_at` DATETIME(3) NULL;

CREATE INDEX `email_campaign_logs_campaign_sent_at_idx` ON `email_campaign_logs`(`campaign`, `sent_at`);
