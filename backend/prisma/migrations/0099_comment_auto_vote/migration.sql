-- Marks comments created by the answer poll (tap an answer = comment). Additive: one column with a default.

ALTER TABLE `exam_comments` ADD COLUMN `auto_vote` BOOLEAN NOT NULL DEFAULT false;
