import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  signCheckInToken,
  verifyCheckInToken,
} from "@/lib/security/qr-token";
import {
  hasValidBearerToken,
  hasValidSha256Signature,
} from "@/lib/security/secrets";

const originalQrSecret = process.env.QR_SIGNING_SECRET;

beforeAll(() => {
  process.env.QR_SIGNING_SECRET = "test-secret-with-more-than-thirty-two-bytes";
});

afterAll(() => {
  if (originalQrSecret) process.env.QR_SIGNING_SECRET = originalQrSecret;
  else delete process.env.QR_SIGNING_SECRET;
});

describe("service authentication", () => {
  it("accepts only an exact bearer token", () => {
    expect(hasValidBearerToken("Bearer cron-secret", "cron-secret")).toBe(true);
    expect(hasValidBearerToken("Bearer wrong", "cron-secret")).toBe(false);
    expect(hasValidBearerToken("Basic cron-secret", "cron-secret")).toBe(false);
    expect(hasValidBearerToken("Bearer cron-secret extra", "cron-secret")).toBe(
      false,
    );
  });

  it("verifies Meta-style SHA-256 signatures", () => {
    const body = '{"event":"delivered"}';
    const signature = `sha256=${createHmac("sha256", "app-secret")
      .update(body)
      .digest("hex")}`;
    expect(hasValidSha256Signature(body, signature, "app-secret")).toBe(true);
    expect(
      hasValidSha256Signature(`${body}x`, signature, "app-secret"),
    ).toBe(false);
  });
});

describe("check-in tokens", () => {
  it("round-trips signed, unexpired claims", async () => {
    const claims = {
      version: 1 as const,
      memberId: "member-1",
      sessionId: "session-1",
      expiresAt: Date.now() + 60_000,
    };
    const token = await signCheckInToken(claims);
    await expect(verifyCheckInToken(token)).resolves.toEqual(claims);
  });

  it("rejects tampering", async () => {
    const token = await signCheckInToken({
      version: 1,
      memberId: "member-1",
      sessionId: "session-1",
      expiresAt: Date.now() + 60_000,
    });
    await expect(verifyCheckInToken(`${token}x`)).resolves.toBeNull();
  });

  it("rejects expired tokens", async () => {
    const token = await signCheckInToken({
      version: 1,
      memberId: "member-1",
      sessionId: "session-1",
      expiresAt: Date.now() - 1,
    });
    await expect(verifyCheckInToken(token)).resolves.toBeNull();
  });
});
