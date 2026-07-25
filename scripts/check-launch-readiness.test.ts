import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const scriptPath = resolve(
  process.cwd(),
  "scripts/check-launch-readiness.mjs",
);

function completeEnvironment(stripeKey: string) {
  const certificate = Buffer.from(
    "-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----",
  ).toString("base64");
  const privateKey = Buffer.from(
    "-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----",
  ).toString("base64");

  return {
    ...process.env,
    NEXT_PUBLIC_APP_URL: "https://staging.legendx.hk",
    NEXT_PUBLIC_SUPABASE_URL: "https://legendxstaging.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_123456789012345678901234567890",
    SUPABASE_SERVICE_ROLE_KEY: "sb_secret_123456789012345678901234567890",
    STRIPE_SECRET_KEY: stripeKey,
    STRIPE_WEBHOOK_SECRET: "whsec_123456789012345678901234567890",
    FPS_IDENTIFIER: "1234567",
    RESEND_API_KEY: "re_123456789012345678901234567890",
    RESEND_FROM_EMAIL: "LegendX <notifications@legendx.hk>",
    META_WHATSAPP_ACCESS_TOKEN: "EAAB123456789012345678901234567890",
    META_WHATSAPP_PHONE_NUMBER_ID: "123456789012345",
    META_WHATSAPP_VERIFY_TOKEN: "verify_123456789012345678901234567890",
    META_APP_SECRET: "meta_123456789012345678901234567890",
    META_WHATSAPP_REMINDER_TEMPLATE: "legendx_lesson_reminder",
    ZOOM_ACCOUNT_ID: "zoom-account",
    ZOOM_CLIENT_ID: "zoom-client",
    ZOOM_CLIENT_SECRET: "zoom-secret",
    CRON_SECRET: "cron_123456789012345678901234567890",
    QR_SIGNING_SECRET: "qr_12345678901234567890123456789012",
    APPLE_PASS_TYPE_IDENTIFIER: "pass.hk.legendx.member",
    APPLE_TEAM_IDENTIFIER: "ABC1234567",
    APPLE_PASS_CERTIFICATE_BASE64: certificate,
    APPLE_PASS_PRIVATE_KEY_BASE64: privateKey,
    APPLE_WWDR_CERTIFICATE_BASE64: certificate,
    GOOGLE_WALLET_ISSUER_ID: "3388000000000000000",
    GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
      type: "service_account",
      client_email: "wallet@legendx.iam.gserviceaccount.com",
      private_key: "-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----",
    }),
    NEXT_PUBLIC_SENTRY_DSN: "https://public@o1.ingest.sentry.io/1",
    SENTRY_ORG: "legendx",
    SENTRY_PROJECT: "platform",
    SENTRY_AUTH_TOKEN: "sntrys_123456789012345678901234567890",
  };
}

describe("launch readiness CLI", () => {
  it("passes a complete staging configuration", () => {
    const output = execFileSync(
      process.execPath,
      [scriptPath, "--target=staging"],
      {
        encoding: "utf8",
        env: completeEnvironment(
          "sk_test_123456789012345678901234567890",
        ),
      },
    );

    expect(output).toContain("Launch readiness passed.");
  });

  it("passes a restricted Stripe key for staging", () => {
    const output = execFileSync(
      process.execPath,
      [scriptPath, "--target=staging"],
      {
        encoding: "utf8",
        env: completeEnvironment(
          "rk_test_123456789012345678901234567890",
        ),
      },
    );

    expect(output).toContain("Launch readiness passed.");
  });

  it("rejects a test Stripe key for production", () => {
    expect(() =>
      execFileSync(
        process.execPath,
        [scriptPath, "--target=production"],
        {
          encoding: "utf8",
          env: completeEnvironment(
            "sk_test_123456789012345678901234567890",
          ),
          stdio: "pipe",
        },
      ),
    ).toThrow(/sk_live_ or rk_live_/);
  });
});
