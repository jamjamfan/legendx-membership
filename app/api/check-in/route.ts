import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyCheckInToken } from "@/lib/security/qr-token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  token: z.string().min(20),
  lessonId: z.string().uuid(),
  action: z.enum(["check_in", "check_out"]).default("check_in"),
});

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

async function completeEnrollmentIfReady(
  admin: AdminClient,
  enrollmentId: string,
  memberId: string,
  sessionId: string,
): Promise<number | null> {
  const [{ data: lessons }, { data: attendance }] = await Promise.all([
    admin.from("session_lessons").select("id").eq("session_id", sessionId),
    admin
      .from("attendance_records")
      .select("lesson_id, checked_out_at")
      .eq("enrollment_id", enrollmentId),
  ]);
  const lessonIds = new Set((lessons ?? []).map((lesson) => lesson.id));
  const completedLessonIds = new Set(
    (attendance ?? [])
      .filter((record) => Boolean(record.checked_out_at))
      .map((record) => record.lesson_id),
  );
  if (
    lessonIds.size === 0 ||
    [...lessonIds].some((lessonId) => !completedLessonIds.has(lessonId))
  ) {
    return null;
  }

  const { data: session } = await admin
    .from("course_sessions")
    .select("course_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return null;
  const { data: course } = await admin
    .from("courses")
    .select("stage")
    .eq("id", session.course_id)
    .maybeSingle();
  if (!course) return null;

  await admin
    .from("enrollments")
    .update({ status: "completed" })
    .eq("id", enrollmentId);
  const { data: profile } = await admin
    .from("profiles")
    .select("highest_completed_stage")
    .eq("id", memberId)
    .maybeSingle();
  if ((profile?.highest_completed_stage ?? 0) < course.stage) {
    await admin
      .from("profiles")
      .update({ highest_completed_stage: course.stage })
      .eq("id", memberId);
  }
  return course.stage;
}

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

  const [
    { data: enrollment, error: enrollmentError },
    { data: lesson },
    { data: memberProfile },
  ] =
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
      admin
        .from("profiles")
        .select("display_name")
        .eq("id", claims.memberId)
        .maybeSingle(),
    ]);

  if (enrollmentError || !enrollment) {
    return NextResponse.json({ error: "active_enrollment_required" }, { status: 403 });
  }
  if (!lesson || lesson.session_id !== claims.sessionId) {
    return NextResponse.json({ error: "lesson_session_mismatch" }, { status: 400 });
  }

  if (parsed.data.action === "check_in") {
    const checkedInAt = new Date().toISOString();
    const { error } = await admin.from("attendance_records").insert({
      enrollment_id: enrollment.id,
      lesson_id: parsed.data.lessonId,
      member_id: claims.memberId,
      method: "qr",
      checked_in_by: actorId,
      checked_in_at: checkedInAt,
    });

    if (error?.code === "23505") {
      return NextResponse.json({ error: "already_checked_in" }, { status: 409 });
    }
    if (error) {
      return NextResponse.json({ error: "check_in_failed" }, { status: 500 });
    }

    return NextResponse.json({
      action: "check_in",
      memberName: memberProfile?.display_name ?? "LegendX 學員",
      eventAt: checkedInAt,
    });
  }

  const { data: attendance } = await admin
    .from("attendance_records")
    .select("id, checked_out_at")
    .eq("enrollment_id", enrollment.id)
    .eq("lesson_id", parsed.data.lessonId)
    .maybeSingle();
  if (!attendance) {
    return NextResponse.json({ error: "not_checked_in" }, { status: 409 });
  }
  if (attendance.checked_out_at) {
    return NextResponse.json({ error: "already_checked_out" }, { status: 409 });
  }

  const checkedOutAt = new Date().toISOString();
  const { error: checkoutError } = await admin
    .from("attendance_records")
    .update({
      checked_out_at: checkedOutAt,
      checked_out_by: actorId,
    })
    .eq("id", attendance.id)
    .is("checked_out_at", null);
  if (checkoutError) {
    return NextResponse.json({ error: "check_out_failed" }, { status: 500 });
  }

  const stageCompleted = await completeEnrollmentIfReady(
    admin,
    enrollment.id,
    claims.memberId,
    claims.sessionId,
  );
  return NextResponse.json({
    action: "check_out",
    memberName: memberProfile?.display_name ?? "LegendX 學員",
    eventAt: checkedOutAt,
    stageCompleted,
  });
}
