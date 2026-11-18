-- "Load new data" on the admin sources page: the catalog run it starts scans incrementally, then chains into a source run.
-- Additive: one new column with a default (existing runs are plain full scans). No UPDATE/DELETE of existing rows. Applies after 0084.
ALTER TABLE `fuo_catalog_runs` ADD COLUMN `auto_import` BOOLEAN NOT NULL DEFAULT false;
