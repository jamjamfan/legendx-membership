import { NextResponse } from "next/server";
import { createAppleWalletPass } from "@/lib/integrations/apple-wallet";
import { signCheckInToken } from "@/lib/security/qr-token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session");
  if (!sessionId) {
    return NextResponse.json({ error: "session_required" }, { status: 400 });
  }
  const server = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!server || !admin) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "authentication_required" },
      { status: 401 },
    );
  }

  const [{ data: enrollment }, { data: profile }, { data: session }] =
    await Promise.all([
      admin
        .from("enrollments")
        .select("id")
        .eq("member_id", user.id)
        .eq("session_id", sessionId)
        .in("status", ["confirmed", "completed"])
        .maybeSingle(),
      admin
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle(),
      admin
        .from("course_sessions")
        .select(
          "title, starts_at, ends_at, area, venue_name, full_address",
        )
        .eq("id", sessionId)
        .maybeSingle(),
    ]);
  if (!enrollment || !profile || !session) {
    return NextResponse.json(
      { error: "active_enrollment_required" },
      { status: 403 },
    );
  }

  const expiresAt = new Date(session.ends_at).getTime() + 24 * 60 * 60 * 1000;
  const qrToken = await signCheckInToken({
    version: 1,
    memberId: user.id,
    sessionId,
    expiresAt,
  });
  const pass = await createAppleWalletPass({
    serialNumber: `legendx-${user.id}-${sessionId}`,
    memberName: profile.display_name,
    sessionTitle: session.title,
    startsAt: session.starts_at,
    endsAt: session.ends_at,
    venue: [session.venue_name, session.full_address, session.area]
      .filter(Boolean)
      .join(" · "),
    qrToken,
  });
  if (!pass) {
    return NextResponse.json(
      { error: "apple_wallet_not_configured" },
      { status: 503 },
    );
  }
  return new NextResponse(new Uint8Array(pass), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": 'attachment; filename="legendx-class-pass.pkpass"',
      "Cache-Control": "private, no-store",
    },
  });
}
