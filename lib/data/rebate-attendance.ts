import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

export interface RebateAttendanceStatus {
  totalLessons: number;
  checkedInLessons: number;
  completedLessons: number;
  totalMinutes: number;
  eligible: boolean;
}

export async function getRebateAttendanceStatus(
  admin: AdminClient,
  referredOrderId: string,
  referredMemberId: string,
): Promise<RebateAttendanceStatus> {
  const { data: order } = await admin
    .from("orders")
    .select("session_id")
    .eq("id", referredOrderId)
    .maybeSingle();
  if (!order) {
    return {
      totalLessons: 0,
      checkedInLessons: 0,
      completedLessons: 0,
      totalMinutes: 0,
      eligible: false,
    };
  }

  const { data: lessons } = await admin
    .from("session_lessons")
    .select("id")
    .eq("session_id", order.session_id);
  const lessonIds = (lessons ?? []).map((lesson) => lesson.id);
  if (lessonIds.length === 0) {
    return {
      totalLessons: 0,
      checkedInLessons: 0,
      completedLessons: 0,
      totalMinutes: 0,
      eligible: false,
    };
  }

  const { data: records } = await admin
    .from("attendance_records")
    .select("lesson_id, checked_in_at, checked_out_at")
    .eq("member_id", referredMemberId)
    .in("lesson_id", lessonIds);

  const checkedInLessons = records?.length ?? 0;
  const completedRecords = (records ?? []).filter(
    (record) => Boolean(record.checked_out_at),
  );
  const totalMinutes = completedRecords.reduce((sum, record) => {
    const started = new Date(record.checked_in_at).getTime();
    const ended = new Date(record.checked_out_at as string).getTime();
    return sum + Math.max(0, Math.round((ended - started) / 60_000));
  }, 0);

  return {
    totalLessons: lessonIds.length,
    checkedInLessons,
    completedLessons: completedRecords.length,
    totalMinutes,
    eligible: completedRecords.length === lessonIds.length,
  };
}
