import { z } from "zod";

export const referralCodeParam = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,12}$/, "Mã giới thiệu không hợp lệ"),
});

export const claimReferralBody = z.object({
  code: z.string("Vui lòng nhập mã").trim().toUpperCase().regex(/^[A-Z0-9]{4,12}$/, "Mã giới thiệu không hợp lệ"),
});

export type ClaimReferralBody = z.infer<typeof claimReferralBody>;
export type ReferralCodeParam = z.infer<typeof referralCodeParam>;
