-- AlterTable: true when the exam was opened free thanks to Pro (locks again when Pro ends). Paid or imported exams stay false = owned forever. Additive, default false keeps every existing row permanent.
ALTER TABLE `user_exams` ADD COLUMN `via_pro` BOOLEAN NOT NULL DEFAULT false;
