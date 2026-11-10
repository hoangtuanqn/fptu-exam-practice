-- The ad feature was removed; drop its saved settings. Data-only migration, no schema change.
DELETE FROM `settings` WHERE `key` LIKE 'ads.%';
