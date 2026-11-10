// Credit from a giftcode can have a lifetime counted from the moment it is redeemed. Unused credit is removed when it ends.
export const CREDIT_TTL_MAX_MINUTES = 60 * 24 * 365; // admin can set at most one year
export const CREDIT_EXPIRY_BATCH = 200; // lots handled per run of the expiry job
