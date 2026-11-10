-- Which link-shortener service issued each link reward request (additive: one column with a default)
ALTER TABLE `link_reward_requests` ADD COLUMN `provider` VARCHAR(20) NOT NULL DEFAULT 'link4m';
