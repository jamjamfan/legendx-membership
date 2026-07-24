#!/usr/bin/env node

const targetArg = process.argv.find((arg) => arg.startsWith("--target="));
const target = targetArg?.split("=")[1];

if (!["staging", "production"].includes(target)) {
  console.error(
    "Usage: node scripts/check-launch-readiness.mjs --target=staging|production",
  );
  process.exit(2);
}

const groups = {
  application: ["NEXT_PUBLIC_APP_URL"],
  supabase: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ],
  stripe: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  fps: ["FPS_IDENTIFIER"],
  resend: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
  whatsapp: [
    "META_WHATSAPP_ACCESS_TOKEN",
    "META_WHATSAPP_PHONE_NUMBER_ID",
    "META_WHATSAPP_VERIFY_TOKEN",
    "META_APP_SECRET",
    "META_WHATSAPP_REMINDER_TEMPLATE",
  ],
  zoom: ["ZOOM_ACCOUNT_ID", "ZOOM_CLIENT_ID", "ZOOM_CLIENT_SECRET"],
  scheduler: ["CRON_SECRET"],
  qr: ["QR_SIGNING_SECRET"],
  apple_wallet: [
    "APPLE_PASS_TYPE_IDENTIFIER",
    "APPLE_TEAM_IDENTIFIER",
    "APPLE_PASS_CERTIFICATE_BASE64",
    "APPLE_PASS_PRIVATE_KEY_BASE64",
    "APPLE_WWDR_CERTIFICATE_BASE64",
  ],
  google_wallet: ["GOOGLE_WALLET_ISSUER_ID", "GOOGLE_SERVICE_ACCOUNT_JSON"],
  sentry: [
    "NEXT_PUBLIC_SENTRY_DSN",
    "SENTRY_ORG",
    "SENTRY_PROJECT",
    "SENTRY_AUTH_TOKEN",
  ],
};

const errors = [];
const warnings = [];
const placeholderPattern =
  /(?:example\.com|changeme|replace[_ -]?me|your[_ -]?(?:key|token|secret)|<(?![^>]*@)[^>]+>)/i;

function value(name) {
  return process.env[name]?.trim() ?? "";
}

function requireValue(name, group) {
  const current = value(name);
  if (!current) {
    errors.push(`${group}: ${name} is missing`);
  } else if (placeholderPattern.test(current)) {
    errors.push(`${group}: ${name} still contains a placeholder`);
  }
}

function validateHttpsUrl(name, expectedHostSuffix) {
  const current = value(name);
  if (!current) return;
  try {
    const parsed = new URL(current);
    if (parsed.protocol !== "https:") {
      errors.push(`${name} must use https`);
    }
    if (
      ["localhost", "127.0.0.1"].includes(parsed.hostname) ||
      parsed.hostname.endsWith(".local")
    ) {
      errors.push(`${name} cannot point to a local host`);
    }
    if (expectedHostSuffix && !parsed.hostname.endsWith(expectedHostSuffix)) {
      errors.push(`${name} must use a ${expectedHostSuffix} host`);
    }
  } catch {
    errors.push(`${name} must be a valid URL`);
  }
}

function validateBase64Pem(name, marker) {
  const current = value(name);
  if (!current) return;
  try {
    const decoded = Buffer.from(current, "base64").toString("utf8");
    if (!decoded.includes(marker)) {
      errors.push(`${name} does not decode to the expected PEM material`);
    }
  } catch {
    errors.push(`${name} is not valid base64`);
  }
}

for (const [group, names] of Object.entries(groups)) {
  for (const name of names) requireValue(name, group);
}

validateHttpsUrl("NEXT_PUBLIC_APP_URL");
validateHttpsUrl("NEXT_PUBLIC_SUPABASE_URL", ".supabase.co");
validateHttpsUrl("NEXT_PUBLIC_SENTRY_DSN");

const stripeSecret = value("STRIPE_SECRET_KEY");
if (stripeSecret) {
  const requiredPrefix = target === "production" ? "sk_live_" : "sk_test_";
  if (!stripeSecret.startsWith(requiredPrefix)) {
    errors.push(
      `STRIPE_SECRET_KEY must start with ${requiredPrefix} for ${target}`,
    );
  }
}
if (
  value("STRIPE_WEBHOOK_SECRET") &&
  !value("STRIPE_WEBHOOK_SECRET").startsWith("whsec_")
) {
  errors.push("STRIPE_WEBHOOK_SECRET must start with whsec_");
}
if (
  value("RESEND_API_KEY") &&
  !value("RESEND_API_KEY").startsWith("re_")
) {
  errors.push("RESEND_API_KEY must start with re_");
}
if (
  value("SENTRY_AUTH_TOKEN") &&
  !value("SENTRY_AUTH_TOKEN").startsWith("sntrys_")
) {
  warnings.push("SENTRY_AUTH_TOKEN does not use the current sntrys_ prefix");
}

for (const name of ["CRON_SECRET", "QR_SIGNING_SECRET", "META_APP_SECRET"]) {
  if (value(name) && value(name).length < 32) {
    errors.push(`${name} must contain at least 32 characters`);
  }
}
if (
  value("CRON_SECRET") &&
  value("QR_SIGNING_SECRET") &&
  value("CRON_SECRET") === value("QR_SIGNING_SECRET")
) {
  errors.push("CRON_SECRET and QR_SIGNING_SECRET must be different");
}

const resendFrom = value("RESEND_FROM_EMAIL");
if (resendFrom && !/^[^<>]*<[^@\s]+@[^@\s]+>$|^[^@\s]+@[^@\s]+$/.test(resendFrom)) {
  errors.push("RESEND_FROM_EMAIL must contain a valid sender email");
}

if (
  value("META_GRAPH_API_VERSION") &&
  !/^v\d+\.\d+$/.test(value("META_GRAPH_API_VERSION"))
) {
  errors.push("META_GRAPH_API_VERSION must look like v23.0");
}

const googleJson = value("GOOGLE_SERVICE_ACCOUNT_JSON");
if (googleJson) {
  try {
    const parsed = JSON.parse(googleJson);
    if (
      parsed.type !== "service_account" ||
      typeof parsed.client_email !== "string" ||
      typeof parsed.private_key !== "string"
    ) {
      errors.push(
        "GOOGLE_SERVICE_ACCOUNT_JSON is not a complete service-account document",
      );
    }
  } catch {
    errors.push("GOOGLE_SERVICE_ACCOUNT_JSON must be valid compact JSON");
  }
}

validateBase64Pem(
  "APPLE_PASS_CERTIFICATE_BASE64",
  "BEGIN CERTIFICATE",
);
validateBase64Pem(
  "APPLE_PASS_PRIVATE_KEY_BASE64",
  "PRIVATE KEY",
);
validateBase64Pem(
  "APPLE_WWDR_CERTIFICATE_BASE64",
  "BEGIN CERTIFICATE",
);

console.log(`LegendX ${target} launch readiness`);
for (const [group, names] of Object.entries(groups)) {
  const ready = names.every(
    (name) => value(name) && !placeholderPattern.test(value(name)),
  );
  console.log(`${ready ? "PASS" : "FAIL"}  ${group}`);
}
for (const warning of warnings) console.warn(`WARN  ${warning}`);
for (const error of errors) console.error(`ERROR ${error}`);

if (errors.length > 0) {
  console.error(`Launch readiness failed with ${errors.length} error(s).`);
  process.exit(1);
}

console.log("Launch readiness passed.");
