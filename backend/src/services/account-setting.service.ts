import { ACCOUNT_DEFAULTS, ACCOUNT_KEY_PREFIX, type AccountConfig } from "../constants/account";
import { settingRepository } from "../repositories/setting.repository";
import type { Db } from "../repositories/wallet.repository";
import type { UpdateAccountBody } from "../rules/requests/setting.request";
import { walletService } from "./wallet.service";

const keyOf = (name: keyof AccountConfig) => `${ACCOUNT_KEY_PREFIX}${name}`;
const NAMES = Object.keys(ACCOUNT_DEFAULTS) as (keyof AccountConfig)[];

const parse = (name: keyof AccountConfig, raw: string | undefined) => {
  const fallback = ACCOUNT_DEFAULTS[name];
  return raw !== undefined && Number.isFinite(Number(raw)) ? Number(raw) : fallback;
};

export const accountSettingService = {
  async get(): Promise<AccountConfig> {
    const raw = await settingRepository.getMany(NAMES.map(keyOf));
    return Object.fromEntries(NAMES.map((n) => [n, parse(n, raw[keyOf(n)])])) as unknown as AccountConfig;
  },

  async update(body: UpdateAccountBody) {
    await settingRepository.setMany(Object.fromEntries(Object.entries(body).map(([k, v]) => [keyOf(k as keyof AccountConfig), String(v)])));
    return this.get();
  },

  /** Gọi trong transaction đăng ký: tặng credit đăng ký (nếu admin đặt > 0). Trả số dư sau khi cộng, hoặc null nếu không tặng. */
  async grantSignupCredit(db: Db, userId: number) {
    const { signupCredit } = await this.get();
    if (signupCredit <= 0) return null;
    const entry = await walletService.applyChange(db, { userId, amount: signupCredit, type: "SIGNUP_BONUS", note: "Tặng credit khi đăng ký" });
    return { amount: signupCredit, balanceAfter: entry.balanceAfter };
  },
};
