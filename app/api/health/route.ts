import { NextResponse } from "next/server";
import { getIntegrationReadiness } from "@/lib/integrations/readiness";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const integrations = getIntegrationReadiness();
  const admin = createSupabaseAdminClient();
  let database: "ready" | "not_configured" | "unreachable" = "not_configured";

  if (admin) {
    const { error } = await admin
      .from("settings")
      .select("key", { count: "exact", head: true });
    database = error ? "unreachable" : "ready";
  }

  const requiredReady =
    database === "ready" &&
    integrations
      .filter((item) => item.required)
      .every((item) => item.ready);
  const status =
    database === "unreachable"
      ? "unhealthy"
      : requiredReady
        ? "ready"
        : "degraded";

  return NextResponse.json(
    {
      status,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "local",
      database,
      integrations: integrations.map(
        ({ key, label, purpose, ready, required }) => ({
          key,
          label,
          purpose,
          ready,
          required,
        }),
      ),
      checkedAt: new Date().toISOString(),
    },
    {
      status: status === "ready" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
