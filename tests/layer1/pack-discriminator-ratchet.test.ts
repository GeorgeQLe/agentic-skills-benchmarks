import { describe, expect, it } from "vitest";
import { PACK_SKILLS_WITHOUT_DISCRIMINATOR } from "../layer4/setups/packs/pack-workflows.setup.js";

// Shrinking discriminator ratchet for the pack workflow setups.
//
// A pack skill "leaks" when its only content gate is the prompt-echoed
// `expectedPattern` derived from `focus` — it carries no `requiredOutputPatterns`,
// so a transcriber that copies the prompt/fixture back passes `assertResult`
// without doing the skill's actual work. `PACK_SKILLS_WITHOUT_DISCRIMINATOR` is
// the live, computed set of such skills.
//
// This ratchet pins that set against a literal allowlist and asserts BOTH
// directions:
//   1. No computed-leaky skill is missing from the allowlist  → blocks NEW leaks.
//      (Any new pack definition must ship a real discriminator, or land on the
//      allowlist deliberately — which review will notice.)
//   2. No allowlist entry has left the computed set           → forces it DOWN.
//      (Fixing a skill means deleting its line here; the backlog can only shrink,
//      never silently regrow.)
//
// The end state is an empty allowlist. Mirrors the keystone pattern in
// tests/layer1/no-prompt-echo.test.ts.
// Part 2c is complete: every pack definition now carries a fixture-derived
// `requiredOutputPatterns` discriminator, so the backlog is empty. The ratchet
// stays in place to block NEW leaks — any pack definition added without a real
// discriminator will fail the "blocks new leaks" case below until it ships one
// (or is deliberately re-added here, which review will notice).
const KNOWN_LEAKY_PACK_SKILLS: string[] = [];

describe("pack discriminator ratchet", () => {
  const computed = new Set(PACK_SKILLS_WITHOUT_DISCRIMINATOR);
  const allowlist = new Set(KNOWN_LEAKY_PACK_SKILLS);

  it("blocks new leaks: every discriminator-less pack skill is a known, tracked entry", () => {
    const newLeaks = [...computed].filter((skill) => !allowlist.has(skill)).sort();
    expect(
      newLeaks,
      `New pack skill(s) without requiredOutputPatterns. Add a real fixture-derived ` +
        `discriminator, or (deliberately) add them to KNOWN_LEAKY_PACK_SKILLS:\n` +
        newLeaks.join("\n"),
    ).toEqual([]);
  });

  it("forces the backlog down: every allowlist entry is still leaky (delete fixed skills)", () => {
    const stale = [...allowlist].filter((skill) => !computed.has(skill)).sort();
    expect(
      stale,
      `These skills now carry a discriminator (or were removed) — delete them from ` +
        `KNOWN_LEAKY_PACK_SKILLS so the ratchet stays tight:\n` +
        stale.join("\n"),
    ).toEqual([]);
  });

  it("keeps the allowlist free of duplicates", () => {
    expect(KNOWN_LEAKY_PACK_SKILLS.length).toBe(allowlist.size);
  });
});
