import { z } from "zod";
import { paginationQuery } from "../../utils/pagination";

export const referralCodeParam = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,12}$/, "Mã giới thiệu không hợp lệ"),
});

export const claimReferralBody = z.object({
  code: z.string("Vui lòng nhập mã").trim().toUpperCase().regex(/^[A-Z0-9]{4,12}$/, "Mã giới thiệu không hợp lệ"),
});

export const listAdminReferralsQuery = paginationQuery.extend({ q: z.string().trim().max(100).optional() }); // email/tên của người giới thiệu hoặc được giới thiệu
export type ListAdminReferralsQuery = z.infer<typeof listAdminReferralsQuery>;

export type ClaimReferralBody = z.infer<typeof claimReferralBody>;
export type ReferralCodeParam = z.infer<typeof referralCodeParam>;
