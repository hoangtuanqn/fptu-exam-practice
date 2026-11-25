import assert from "node:assert/strict";
import { describe, it } from "node:test";

// file-url đọc env khi nạp: đặt giá trị giả để test chạy được không cần .env (không đụng DB)
process.env.DATABASE_URL ??= "mysql://test:test@localhost:3306/test";
process.env.JWT_SECRET ??= "x".repeat(32);

const EXAM = "0190f5c2-7a10-7000-8000-000000000001";

describe("toAttachmentDto (GET exam + exam:attachments)", () => {
  it("maps a row to the public shape: kind from the stored file name, url through the attachment endpoint", async () => {
    const { attachmentUrlOf, toAttachmentDto } = await import("../src/utils/file-url");
    const row = { id: 7, name: "PE_SU26.zip", filePath: `exams/123/files/PE_SU26.zip`, mime: "application/zip", sizeBytes: 2048 };
    assert.deepEqual(toAttachmentDto(EXAM, row), {
      id: 7,
      name: "PE_SU26.zip",
      mime: "application/zip",
      sizeBytes: 2048,
      kind: "archive",
      url: toAttachmentDto(EXAM, row).url,
    });
    assert.match(toAttachmentDto(EXAM, row).url, new RegExp(`/api/v1/exams/${EXAM}/attachments/7\\?v=[0-9a-f]{8}$`));
    // phiên bản đổi khi thay tệp (đường dẫn trên đĩa đổi) hoặc đổi tên, giữ nguyên khi không đổi gì
    assert.notEqual(toAttachmentDto(EXAM, { ...row, filePath: "exams/123/files/ab-PE_SU26.zip" }).url, toAttachmentDto(EXAM, row).url);
    assert.notEqual(toAttachmentDto(EXAM, { ...row, name: "x.zip" }).url, toAttachmentDto(EXAM, row).url);
    assert.equal(toAttachmentDto(EXAM, { ...row, sizeBytes: 1 }).url, toAttachmentDto(EXAM, row).url);
    assert.match(attachmentUrlOf(EXAM, 7), new RegExp(`/api/v1/exams/${EXAM}/attachments/7$`));
    assert.equal(toAttachmentDto(EXAM, { ...row, filePath: "exams/123/files/a.bin" }).kind, "other");
    assert.ok(!("filePath" in toAttachmentDto(EXAM, row))); // không lộ đường dẫn trên đĩa
  });
});
