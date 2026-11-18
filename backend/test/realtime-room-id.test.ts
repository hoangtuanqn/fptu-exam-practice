import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseRoomId } from "../src/realtime/socket.server";

const EXAM = "0190f5c2-7a10-7000-8000-000000000001";

describe("parseRoomId (socket subscribe)", () => {
  it("exam rooms take a UUID (lower-cased), job rooms a positive integer", () => {
    assert.equal(parseRoomId("exam", EXAM.toUpperCase()), EXAM);
    assert.equal(parseRoomId("exam", 7167), null); // old numeric exam id
    assert.equal(parseRoomId("exam", "7167"), null);
    assert.equal(parseRoomId("job", 12), 12);
    assert.equal(parseRoomId("job", "12"), 12);
    assert.equal(parseRoomId("job", EXAM), null);
    assert.equal(parseRoomId("job", 0), null);
  });
});
