import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { MAIL_ASSETS_DIR } from "../src/constants/mail";
import { SEASON_FLAG_CACHE_MS, XMAS_MAIL_END } from "../src/constants/season";
import { mailAssetPath } from "../src/services/mail.service";
import { seasonSettingService } from "../src/services/season-setting.service";

// Ảnh Giáng sinh trong thư: cờ nhớ 60s, hết hạn theo ngày, thiếu tệp thì dùng ảnh thường (không cần DB)

describe("xmas mail images", () => {
  it("caches the flag, stops after the end date", async () => {
    const original = seasonSettingService.isXmasOn;
    let calls = 0;
    let on = true;
    seasonSettingService.isXmasOn = async () => (calls++, on);
    try {
      const t = XMAS_MAIL_END.getTime() - 10 * SEASON_FLAG_CACHE_MS;
      assert.equal(await seasonSettingService.isXmasMailOn(t), true);
      on = false;
      assert.equal(await seasonSettingService.isXmasMailOn(t + 1000), true); // còn trong cache
      assert.equal(calls, 1);
      assert.equal(await seasonSettingService.isXmasMailOn(t + SEASON_FLAG_CACHE_MS), false);
      assert.equal(calls, 2);
      on = true;
      assert.equal(await seasonSettingService.isXmasMailOn(XMAS_MAIL_END.getTime()), false);
      assert.equal(calls, 2);
    } finally {
      seasonSettingService.isXmasOn = original;
    }
  });

  it("falls back to the normal file when the xmas variant is missing or off", () => {
    const normal = path.join(MAIL_ASSETS_DIR, "logo.png");
    assert.equal(mailAssetPath("logo.png", false), normal);
    assert.equal(mailAssetPath("__missing__.png", true), path.join(MAIL_ASSETS_DIR, "__missing__.png"));
  });
});
