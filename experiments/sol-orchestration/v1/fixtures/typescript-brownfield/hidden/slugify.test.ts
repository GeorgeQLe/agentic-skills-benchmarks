import assert from "node:assert/strict";
import test from "node:test";
import { slugify } from "../src/slugify.ts";

test("normalizes punctuation, whitespace, and separators", () => {
  assert.equal(slugify("  Hello,   SOL World!  "), "hello-sol-world");
  assert.equal(slugify("Already---Slugged"), "already-slugged");
  assert.equal(slugify("***"), "");
});
