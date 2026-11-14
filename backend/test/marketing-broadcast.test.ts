import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderBroadcast } from "../src/mail/templates/marketing";
import { createBroadcastBody, listLogsQuery } from "../src/rules/requests/marketing.request";
import { isBroadcastConfirm } from "../src/services/marketing-broadcast.service";

// Gửi thủ công: kiểm tra body, chữ xác nhận và thư dựng ra (không cần DB, không gửi thư)

const valid = { subject: "Kỳ thi sắp tới", body: "Xin chào", ctaLabel: "Xem ngay", ctaPath: "/mon/PRO192", segment: "all" };
const ok = (patch: Record<string, unknown>) => createBroadcastBody.safeParse({ ...valid, ...patch }).success;

describe("broadcast body", () => {
  it("accepts a valid draft and enforces lengths", () => {
    assert.equal(ok({}), true);
    assert.equal(ok({ subject: "a".repeat(120), body: "b".repeat(5000), ctaLabel: "c".repeat(40) }), true);
    assert.equal(ok({ subject: "a".repeat(121) }), false);
    assert.equal(ok({ body: "b".repeat(5001) }), false);
    assert.equal(ok({ ctaLabel: "c".repeat(41) }), false);
    assert.equal(ok({ subject: "  " }), false);
    assert.equal(ok({ subject: "a\r\nBcc: x@y.z" }), false); // tiêu đề một dòng
  });

  it("only allows internal button paths", () => {
    for (const path of ["/", "/pro", "/mon/PRO192?tab=de#top", "/account/review"]) assert.equal(ok({ ctaPath: path }), true, path);
    for (const path of ["//evil.example", "https://evil.example", "evil.example", "/\\evil.example", "/ x", "javascript:alert(1)", "", `/${"a".repeat(120)}`]) {
      assert.equal(ok({ ctaPath: path }), false, path);
    }
  });

  it("takes a fixed segment and inactive days within 7..180", () => {
    assert.equal(ok({ segment: "everyone" }), false);
    assert.equal(ok({ segment: "inactive" }), false);
    assert.equal(ok({ segment: "inactive", segmentDays: 6 }), false);
    assert.equal(ok({ segment: "inactive", segmentDays: 181 }), false);
    assert.equal(ok({ segment: "inactive", segmentDays: 30 }), true);
    for (const segment of ["pro", "free", "exam_soon"]) assert.equal(ok({ segment }), true);
  });

  it("requires the exact confirm word", () => {
    assert.equal(isBroadcastConfirm("GỬI"), true);
    assert.equal(isBroadcastConfirm(" GỬI ".normalize("NFD")), true); // dấu tổ hợp từ bàn phím
    for (const bad of [undefined, null, "", "GUI", "gửi", "GỬI GỬI", ["GỬI"], 1]) assert.equal(isBroadcastConfirm(bad), false, String(bad));
  });
});

describe("broadcast mail", () => {
  const mail = renderBroadcast({
    name: "Lan",
    unsubscribeUrl: "https://site.example/unsubscribe?t=x&c=news",
    subject: "Tin <b>mới</b>",
    body: 'Đoạn một <script>alert("x")</script>\ndòng hai\n\n  \nĐoạn <a href="https://evil.example">hai</a>',
    ctaLabel: "Xem <i>ngay</i>",
    url: "__URL__",
  });

  it("escapes every piece of admin text and keeps paragraphs", () => {
    assert.equal(/<script|<a href="https:\/\/evil|<b>|<i>/.test(mail.html), false);
    assert.ok(mail.html.includes("&lt;script&gt;"));
    assert.ok(mail.html.includes("dòng hai"));
    assert.ok(mail.html.includes("<br />dòng hai"));
    assert.equal(mail.subject, "Tin <b>mới</b>"); // tiêu đề thư là chữ thường, không phải HTML
    assert.ok(mail.text.includes('Đoạn một <script>alert("x")</script>\ndòng hai\n\nĐoạn'));
  });

  it("has exactly one button and the news unsubscribe link", () => {
    assert.equal(mail.html.split('class="btn"').length - 1, 1);
    assert.ok(mail.html.includes('href="__URL__"'));
    assert.ok(mail.text.includes("Xem <i>ngay</i>: __URL__"));
    assert.ok(mail.html.includes("&amp;c=news"));
  });
});

describe("log filters", () => {
  const parse = (q: Record<string, string>) => listLogsQuery.safeParse(q);
  it("accepts campaign keys and broadcasts, rejects anything else", () => {
    for (const campaign of ["winback", "pro_upsell", "pro_expiry", "broadcast", "broadcast:12"]) assert.equal(parse({ campaign }).success, true, campaign);
    for (const campaign of ["broadcast:", "broadcast:x", "news", "winback' OR 1=1"]) assert.equal(parse({ campaign }).success, false, campaign);
  });

  it("reads Vietnam days and bounds the page size", () => {
    const r = listLogsQuery.parse({ from: "2026-11-01", to: "2026-11-02", page: "2" });
    assert.equal(r.from?.toISOString(), "2026-10-31T17:00:00.000Z");
    assert.equal(r.page, 2);
    assert.equal(parse({ from: "01/11/2026" }).success, false);
    assert.equal(parse({ limit: "500" }).success, false);
  });
});
