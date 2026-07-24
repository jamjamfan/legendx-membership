import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => null),
}));

import {
  getPublicSessionById,
  getPublicSessions,
  hasValidReferralCode,
} from "@/lib/data/public-sessions";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("public session demo boundaries", () => {
  it("keeps demo sessions available outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");

    const sessions = await getPublicSessions(1);

    expect(sessions.length).toBeGreaterThan(0);
    await expect(
      getPublicSessionById("session-stage-1-aug"),
    ).resolves.not.toBeNull();
    await expect(hasValidReferralCode("GOLD8888")).resolves.toBe(true);
  });

  it("fails closed when the production database is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(getPublicSessions(1)).resolves.toEqual([]);
    await expect(
      getPublicSessionById("session-stage-1-aug"),
    ).resolves.toBeNull();
    await expect(hasValidReferralCode("GOLD8888")).resolves.toBe(false);
  });
});
