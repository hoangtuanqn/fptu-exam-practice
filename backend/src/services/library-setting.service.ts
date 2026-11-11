import { LIBRARY_DEFAULTS, LIBRARY_KEY_PREFIX, type LibraryConfig } from "../constants/library";
import { settingRepository } from "../repositories/setting.repository";
import type { UpdateLibraryBody } from "../rules/requests/library.request";

const keyOf = (name: keyof LibraryConfig) => `${LIBRARY_KEY_PREFIX}${name}`;
const NAMES = Object.keys(LIBRARY_DEFAULTS) as (keyof LibraryConfig)[];
const flag = (raw: string | undefined, fallback: boolean) => (raw === undefined || raw === "" ? fallback : raw === "true");
const num = (raw: string | undefined, fallback: number) => (raw !== undefined && raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : fallback);

export const librarySettingService = {
  async get(): Promise<LibraryConfig> {
    const raw = await settingRepository.getMany(NAMES.map(keyOf));
    return {
      enabled: flag(raw[keyOf("enabled")], LIBRARY_DEFAULTS.enabled),
      freeRuleEnabled: flag(raw[keyOf("freeRuleEnabled")], LIBRARY_DEFAULTS.freeRuleEnabled),
      newestTermsPaid: num(raw[keyOf("newestTermsPaid")], LIBRARY_DEFAULTS.newestTermsPaid),
    };
  },

  async update(body: UpdateLibraryBody) {
    await settingRepository.setMany({
      [keyOf("enabled")]: String(body.enabled),
      [keyOf("freeRuleEnabled")]: String(body.freeRuleEnabled),
      [keyOf("newestTermsPaid")]: String(body.newestTermsPaid),
    });
    return this.get();
  },
};
