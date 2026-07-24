#!/usr/bin/env node

const baseUrlArg = process.argv.find((arg) => arg.startsWith("--url="));
const baseUrl = baseUrlArg?.slice("--url=".length).replace(/\/+$/, "");

if (!baseUrl) {
  console.error(
    "Usage: node scripts/verify-deployment.mjs --url=https://your-domain",
  );
  process.exit(2);
}

let parsed;
try {
  parsed = new URL(baseUrl);
} catch {
  console.error("Deployment URL is invalid.");
  process.exit(2);
}
if (parsed.protocol !== "https:") {
  console.error("Deployment verification requires an https URL.");
  process.exit(2);
}

const checks = [
  { path: "/", expected: 200 },
  { path: "/course/1", expected: 200 },
  { path: "/login", expected: 200 },
  { path: "/privacy", expected: 200 },
  { path: "/terms", expected: 200 },
  { path: "/robots.txt", expected: 200 },
  { path: "/sitemap.xml", expected: 200 },
];

const failures = [];
for (const check of checks) {
  try {
    const response = await fetch(`${baseUrl}${check.path}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status !== check.expected) {
      failures.push(
        `${check.path}: expected ${check.expected}, received ${response.status}`,
      );
    } else {
      console.log(`PASS  ${check.path} (${response.status})`);
    }
  } catch (error) {
    failures.push(
      `${check.path}: ${error instanceof Error ? error.message : "request failed"}`,
    );
  }
}

try {
  const response = await fetch(`${baseUrl}/api/health`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json();
  const missing = Array.isArray(body.integrations)
    ? body.integrations
        .filter((item) => !item.ready)
        .map((item) => item.key)
    : ["invalid_health_payload"];

  if (
    response.status !== 200 ||
    body.status !== "ready" ||
    body.database !== "ready" ||
    missing.length > 0
  ) {
    failures.push(
      `/api/health: HTTP ${response.status}, status=${body.status}, database=${body.database}, incomplete=${missing.join(",") || "none"}`,
    );
  } else {
    console.log(
      `PASS  /api/health (version ${body.version ?? "unknown"}, all integrations ready)`,
    );
  }
} catch (error) {
  failures.push(
    `/api/health: ${error instanceof Error ? error.message : "request failed"}`,
  );
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  process.exit(1);
}

console.log(`Deployment verified: ${baseUrl}`);
