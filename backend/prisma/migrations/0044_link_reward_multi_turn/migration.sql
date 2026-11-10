-- One link reward request can now grant several free turns: replace the unique index on request_id with a plain one.
-- The plain index is created first because the foreign key needs an index on the column.
CREATE INDEX `free_explain_turns_request_id_idx` ON `free_explain_turns`(`request_id`);
DROP INDEX `free_explain_turns_request_id_key` ON `free_explain_turns`;
