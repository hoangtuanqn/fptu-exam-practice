-- Credit paid to the member when an admin confirms this dislike (0 = not rewarded). Additive: one column with a default.

ALTER TABLE `explanation_feedback` ADD COLUMN `reward` INT NOT NULL DEFAULT 0;
