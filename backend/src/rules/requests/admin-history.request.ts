import { z } from "zod";
import { paginationQuery } from "../../utils/pagination";

const userId = z.coerce.number().int().positive().optional();
const search = z.string().trim().max(100).optional(); // email hoặc tên

export const listWalletQuery = paginationQuery.extend({
  userId,
  search,
  type: z
    .enum([
      "DEPOSIT",
      "ADMIN_ADJUST",
      "CRAWL_CHARGE",
      "CRAWL_REFUND",
      "GIFT_CODE",
      "REPORT_REWARD",
      "EXPLAIN_CHARGE",
      "EXPLAIN_REFUND",
      "REFERRAL_BONUS",
      "REFERRAL_COMMISSION",
      "SIGNUP_BONUS",
      "DEPOSIT_BONUS",
      "PE_CHARGE",
      "PE_REFUND",
      "CHECKIN_REWARD",
    ])
    .optional(),
});

export const listCrawlJobsQuery = paginationQuery.extend({
  userId,
  search,
  status: z.enum(["QUEUED", "RUNNING", "DONE", "FAILED"]).optional(),
});

export const listAttemptsQuery = paginationQuery.extend({
  userId,
  search,
  mode: z.enum(["PRACTICE", "EXAM"]).optional(),
});

export const listPurchasesQuery = paginationQuery.extend({ userId, search });
export type ListPurchasesQuery = z.infer<typeof listPurchasesQuery>;

export type ListWalletQuery = z.infer<typeof listWalletQuery>;
export type ListCrawlJobsQuery = z.infer<typeof listCrawlJobsQuery>;
export type ListAttemptsQuery = z.infer<typeof listAttemptsQuery>;
