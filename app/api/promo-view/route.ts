import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  code: z.string().trim().min(2).max(20),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return new NextResponse(null, { status: 204 });

  const { data: referrer } = await admin
    .from("profiles")
    .select("id")
    .eq("referral_code", parsed.data.code.toUpperCase())
    .maybeSingle();
  if (!referrer) {
    return NextResponse.json({ error: "referral_not_found" }, { status: 404 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const visitorHash = createHash("sha256")
    .update(
      `${process.env.QR_SIGNING_SECRET ?? "local"}:${ip}:${userAgent}:${day}`,
    )
    .digest("hex");
  const dayStart = `${day}T00:00:00.000Z`;

  const { data: existing } = await admin
    .from("promo_events")
    .select("id")
    .eq("referrer_id", referrer.id)
    .eq("event_type", "view")
    .eq("visitor_hash", visitorHash)
    .gte("occurred_at", dayStart)
    .limit(1)
    .maybeSingle();

  if (!existing) {
    await admin.from("promo_events").insert({
      referrer_id: referrer.id,
      event_type: "view",
      visitor_hash: visitorHash,
    });
  }

  return new NextResponse(null, { status: 204 });
}
