-- Manual rollback of 0058 (Prisma ignores this file). Roll back 0059 first: question_group_stats references question_groups.
DROP TABLE IF EXISTS `question_group_members`;
DROP TABLE IF EXISTS `question_groups`;
