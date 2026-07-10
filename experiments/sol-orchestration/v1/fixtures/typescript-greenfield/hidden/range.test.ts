import assert from "node:assert/strict";
import test from "node:test";
import { inclusiveRange } from "../src/range.ts";

test("builds ascending and descending inclusive ranges", () => {
  assert.deepEqual(inclusiveRange(2, 5), [2, 3, 4, 5]);
  assert.deepEqual(inclusiveRange(3, 0), [3, 2, 1, 0]);
  assert.deepEqual(inclusiveRange(7, 7), [7]);
});
