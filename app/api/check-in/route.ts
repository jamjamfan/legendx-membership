import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyCheckInToken } from "@/lib/security/qr-token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  token: z.string().min(20),
  lessonId: z.string().uuid(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const claims = await verifyCheckInToken(parsed.data.token);
  if (!claims) {
    return NextResponse.json({ error: "invalid_or_expired_pass" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  let actorId: string | null = null;
  let authorized = false;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    actorId = user?.id ?? null;
    if (actorId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", actorId)
        .single();
      authorized = Boolean(profile && ["staff", "admin"].includes(profile.role));
    }
  } else {
    const cookieStore = await cookies();
    authorized =
      process.env.NODE_ENV !== "production" &&
      cookieStore.get("legendx_demo_role")?.value === "admin";
  }

  if (!authorized) {
    return NextResponse.json({ error: "staff_required" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({
      mode: "demo",
      checkedIn: true,
      memberId: claims.memberId,
      sessionId: claims.sessionId,
    });
  }

  const [{ data: enrollment, error: enrollmentError }, { data: lesson }] =
    await Promise.all([
      admin
        .from("enrollments")
        .select("id")
        .eq("member_id", claims.memberId)
        .eq("session_id", claims.sessionId)
        .in("status", ["confirmed", "completed"])
        .maybeSingle(),
      admin
        .from("session_lessons")
        .select("id, session_id")
        .eq("id", parsed.data.lessonId)
        .maybeSingle(),
    ]);

  if (enrollmentError || !enrollment) {
    return NextResponse.json({ error: "active_enrollment_required" }, { status: 403 });
  }
  if (!lesson || lesson.session_id !== claims.sessionId) {
    return NextResponse.json({ error: "lesson_session_mismatch" }, { status: 400 });
  }

  const { error } = await admin.from("attendance_records").insert({
    enrollment_id: enrollment.id,
    lesson_id: parsed.data.lessonId,
    member_id: claims.memberId,
    method: "qr",
    checked_in_by: actorId,
  });

  if (error?.code === "23505") {
    return NextResponse.json({ error: "already_checked_in" }, { status: 409 });
  }
  if (error) {
    return NextResponse.json({ error: "check_in_failed" }, { status: 500 });
  }

  return NextResponse.json({ checkedIn: true });
}
