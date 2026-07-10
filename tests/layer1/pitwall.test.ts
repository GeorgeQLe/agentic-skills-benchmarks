import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PitwallClient, normalizePitwallSnapshot, validatePitwallBaseUrl } from "../orchestration/pitwall.js";

function payload(now: number) {
  const capturedAt = new Date(now).toISOString();
  const resetAt = new Date(now + 3 * 60 * 60_000).toISOString();
  return {
    schemaVersion: 1,
    capturedAt,
    providers: {
      openai: { window: "primary_five_hour", usedPercent: 31.25, remainingPercent: 68.75, durationSeconds: 18_000, resetAt, observedAt: capturedAt, confidence: "providerSupplied" },
      anthropic: { window: "seven_day", scope: "all_models", usedPercent: 41.5, remainingPercent: 58.5, resetAt, observedAt: capturedAt, confidence: "exact" },
    },
  };
}

describe("Pitwall allowance client", () => {
  it("normalizes only exact authoritative provider windows", () => {
    const now = Date.now();
    const snapshot = normalizePitwallSnapshot(payload(now), now);
    expect(snapshot).toMatchObject({
      providers: {
        openai: { source: "pitwall-local", window: "primary_five_hour", usedPercent: 31.25, remainingPercent: 68.75, durationSeconds: 18_000, confidence: "providerSupplied" },
        anthropic: { source: "pitwall-local", window: "seven_day", scope: "all_models", usedPercent: 41.5, remainingPercent: 58.5, confidence: "exact" },
      },
    });
  });

  it("rejects partial, stale, mismatched, and non-authoritative payloads", () => {
    const now = Date.now();
    const partial = payload(now); delete (partial.providers as { anthropic?: unknown }).anthropic;
    expect(() => normalizePitwallSnapshot(partial, now)).toThrow("anthropic telemetry is missing");
    const stale = payload(now - 6 * 60_000);
    expect(() => normalizePitwallSnapshot(stale, now)).toThrow("five minutes");
    const wrongWindow = payload(now); wrongWindow.providers.openai.window = "weekly";
    expect(() => normalizePitwallSnapshot(wrongWindow, now)).toThrow("primary five-hour");
    const wrongConfidence = payload(now); wrongConfidence.providers.anthropic.confidence = "providerSupplied";
    expect(() => normalizePitwallSnapshot(wrongConfidence, now)).toThrow("not exact");
  });

  it("rejects future and misaligned timestamps and past resets", () => {
    const now = Date.now();
    const futureEnvelope = payload(now + 1);
    expect(() => normalizePitwallSnapshot(futureEnvelope, now)).toThrow("future");

    const futureObservation = payload(now);
    futureObservation.providers.openai.observedAt = new Date(now + 1).toISOString();
    expect(() => normalizePitwallSnapshot(futureObservation, now)).toThrow("future");

    const afterEnvelope = payload(now);
    afterEnvelope.providers.anthropic.observedAt = new Date(now + 1).toISOString();
    expect(() => normalizePitwallSnapshot(afterEnvelope, now + 2)).toThrow("future");

    const pastReset = payload(now - 1_000);
    pastReset.providers.openai.resetAt = new Date(now - 1).toISOString();
    expect(() => normalizePitwallSnapshot(pastReset, now)).toThrow("reset is not in the future");
  });

  it("accepts only root loopback HTTP origins", () => {
    for (const url of ["http://localhost", "http://localhost:19440", "http://127.0.0.1", "http://[::1]:19440"]) {
      expect(validatePitwallBaseUrl(url)).toMatch(/^http:/);
    }
    for (const url of [
      "https://127.0.0.1:19440", "http://example.com", "http://127.0.0.2", "http://user:pass@localhost",
      "http://localhost/api", "http://localhost/?query=1", "http://localhost/#fragment", "not-a-url",
    ]) expect(() => validatePitwallBaseUrl(url)).toThrow("loopback origin");
  });

  it("rejects an unsafe URL before token-file access or network activity", async () => {
    let requested = false;
    expect(() => new PitwallClient({
      baseUrl: "http://example.com",
      tokenFile: "/definitely/missing/pitwall-token",
      fetch: async () => { requested = true; return new Response(); },
    })).toThrow("loopback origin");
    expect(requested).toBe(false);
  });

  it("discovers the token file, sends bearer auth, and never exposes the token", async () => {
    const root = mkdtempSync(resolve(tmpdir(), "pitwall-client-"));
    try {
      const tokenFile = resolve(root, "token");
      const secret = "sensitive-test-token";
      writeFileSync(tokenFile, `${secret}\n`);
      let authorization = "";
      const client = new PitwallClient({
        baseUrl: "http://127.0.0.1:19440",
        tokenFile,
        now: () => 1_800_000_000_000,
        fetch: async (_url, init) => {
          authorization = (init?.headers as Record<string, string>).Authorization;
          return new Response(JSON.stringify(payload(1_800_000_000_000)), { status: 200, headers: { "content-type": "application/json" } });
        },
      });
      await expect(client.snapshot()).resolves.toMatchObject({ providers: { openai: { remainingPercent: 68.75 } } });
      expect(authorization).toBe(`Bearer ${secret}`);

      const denied = new PitwallClient({ tokenFile, fetch: async () => new Response(secret, { status: 401 }) });
      await expect(denied.snapshot()).rejects.toThrow("authentication failed");
      try { await denied.snapshot(); } catch (error) { expect(String(error)).not.toContain(secret); }
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("fails closed before a request when the token file is unavailable", async () => {
    let requested = false;
    const client = new PitwallClient({ tokenFile: "/definitely/missing/pitwall-token", fetch: async () => { requested = true; return new Response(); } });
    await expect(client.snapshot()).rejects.toThrow("token file is unavailable");
    expect(requested).toBe(false);
  });
});
