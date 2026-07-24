export interface IntegrationReadiness {
  key: string;
  label: string;
  purpose: string;
  ready: boolean;
  required: boolean;
  missing: string[];
}

function integration(
  key: string,
  label: string,
  purpose: string,
  envNames: string[],
  required = true,
): IntegrationReadiness {
  const missing = envNames.filter((name) => !process.env[name]);
  return { key, label, purpose, ready: missing.length === 0, required, missing };
}

export function getIntegrationReadiness(): IntegrationReadiness[] {
  return [
    integration(
      "application",
      "Application URL",
      "正式連結、Auth callback、Wallet deep link",
      ["NEXT_PUBLIC_APP_URL"],
    ),
    integration(
      "supabase",
      "Supabase",
      "登入、PostgreSQL、Storage、RLS",
      [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
      ],
    ),
    integration(
      "stripe",
      "Stripe",
      "信用卡 Checkout、Webhook、退款",
      ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    ),
    integration(
      "fps",
      "FPS",
      "轉數快收款及人工對賬",
      ["FPS_IDENTIFIER"],
    ),
    integration(
      "resend",
      "Resend",
      "交易電郵、課堂提醒、公告",
      ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
    ),
    integration(
      "whatsapp",
      "WhatsApp Cloud API",
      "同意制課堂提醒及公告",
      [
        "META_WHATSAPP_ACCESS_TOKEN",
        "META_WHATSAPP_PHONE_NUMBER_ID",
        "META_WHATSAPP_VERIFY_TOKEN",
        "META_APP_SECRET",
        "META_WHATSAPP_REMINDER_TEMPLATE",
      ],
    ),
    integration(
      "zoom",
      "Zoom",
      "第三階段網上課堂",
      ["ZOOM_ACCOUNT_ID", "ZOOM_CLIENT_ID", "ZOOM_CLIENT_SECRET"],
    ),
    integration(
      "apple_wallet",
      "Apple Wallet",
      "iPhone 課堂通行證",
      [
        "APPLE_PASS_TYPE_IDENTIFIER",
        "APPLE_TEAM_IDENTIFIER",
        "APPLE_PASS_CERTIFICATE_BASE64",
        "APPLE_PASS_PRIVATE_KEY_BASE64",
        "APPLE_WWDR_CERTIFICATE_BASE64",
      ],
    ),
    integration(
      "google_wallet",
      "Google Wallet",
      "Android 課堂通行證",
      ["GOOGLE_WALLET_ISSUER_ID", "GOOGLE_SERVICE_ACCOUNT_JSON"],
    ),
    integration(
      "sentry",
      "Sentry",
      "錯誤追蹤與告警",
      [
        "NEXT_PUBLIC_SENTRY_DSN",
        "SENTRY_ORG",
        "SENTRY_PROJECT",
        "SENTRY_AUTH_TOKEN",
      ],
    ),
    integration(
      "scheduler",
      "Scheduler",
      "過期座位、T−1 日／T−3 小時提醒",
      ["CRON_SECRET"],
    ),
    integration(
      "qr",
      "QR Signing",
      "防偽課堂通行證",
      ["QR_SIGNING_SECRET"],
    ),
  ];
}
