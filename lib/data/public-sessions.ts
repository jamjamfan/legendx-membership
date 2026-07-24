import { demoSessions } from "@/lib/demo-data";
import type { CourseStage } from "@/lib/domain/catalog";
import { isDemoMode } from "@/lib/runtime";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface PublicSession {
  id: string;
  stage: CourseStage;
  title: string;
  dateLabel: string;
  timeLabel: string;
  area: string;
  instructor: string;
  capacity: number;
  seatsRemaining: number;
}

const dateFormatter = new Intl.DateTimeFormat("zh-HK", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
  timeZone: "Asia/Hong_Kong",
});

const compactDateFormatter = new Intl.DateTimeFormat("zh-HK", {
  month: "numeric",
  day: "numeric",
  weekday: "short",
  timeZone: "Asia/Hong_Kong",
});

const yearFormatter = new Intl.DateTimeFormat("zh-HK", {
  year: "numeric",
  timeZone: "Asia/Hong_Kong",
});

const timeFormatter = new Intl.DateTimeFormat("zh-HK", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Hong_Kong",
});

type SessionRow = {
  id: string;
  title: string;
  area: string;
  instructor: string;
  capacity: number;
  starts_at: string;
  ends_at: string;
  seats_remaining: number;
};

type LessonRow = {
  session_id: string;
  starts_at: string;
  ends_at: string;
  position: number;
};

function toPublicSession(
  session: SessionRow,
  stage: CourseStage,
  lessons: LessonRow[],
): PublicSession {
  const orderedLessons = [...lessons].sort(
    (left, right) => left.position - right.position,
  );
  const firstLesson = orderedLessons[0];
  const startsAt = new Date(firstLesson?.starts_at ?? session.starts_at);
  const endsAt = new Date(firstLesson?.ends_at ?? session.ends_at);
  const dateLabel =
    orderedLessons.length > 1
      ? `${yearFormatter.format(startsAt)} ${orderedLessons
          .map((lesson) => compactDateFormatter.format(new Date(lesson.starts_at)))
          .join("、")}`
      : dateFormatter.format(startsAt);

  return {
    id: session.id,
    stage,
    title: session.title,
    dateLabel,
    timeLabel: `${timeFormatter.format(startsAt)}–${timeFormatter.format(endsAt)}`,
    area: session.area,
    instructor: session.instructor,
    capacity: session.capacity,
    seatsRemaining: session.seats_remaining,
  };
}

export async function getPublicSessions(
  stage: CourseStage,
): Promise<PublicSession[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    if (!isDemoMode()) return [];
    return demoSessions
      .filter((session) => session.stage === stage)
      .map((session) => ({ ...session }));
  }

  const { data: course } = await admin
    .from("courses")
    .select("id")
    .eq("stage", stage)
    .eq("active", true)
    .maybeSingle();
  if (!course) return [];

  const { data } = await admin
    .from("public_course_sessions")
    .select(
      "id, title, area, instructor, capacity, starts_at, ends_at, seats_remaining",
    )
    .eq("course_id", course.id)
    .or(
      `enrollment_closes_at.is.null,enrollment_closes_at.gt.${new Date().toISOString()}`,
    )
    .order("starts_at");

  const sessionIds = (data ?? []).map((session) => session.id);
  const { data: lessonRows } =
    sessionIds.length > 0
      ? await admin
          .from("session_lessons")
          .select("session_id, starts_at, ends_at, position")
          .in("session_id", sessionIds)
          .order("position")
      : { data: [] };
  const lessonsBySession = new Map<string, LessonRow[]>();
  for (const lesson of lessonRows ?? []) {
    const current = lessonsBySession.get(lesson.session_id) ?? [];
    current.push(lesson as LessonRow);
    lessonsBySession.set(lesson.session_id, current);
  }

  return (data ?? []).map((session) =>
    toPublicSession(
      session as SessionRow,
      stage,
      lessonsBySession.get(session.id) ?? [],
    ),
  );
}

export async function getPublicSessionById(
  id: string | undefined,
): Promise<PublicSession | null> {
  if (!id) return null;
  const admin = createSupabaseAdminClient();
  if (!admin) {
    if (!isDemoMode()) return null;
    const session = demoSessions.find((item) => item.id === id);
    return session ? { ...session } : null;
  }

  const { data: session } = await admin
    .from("public_course_sessions")
    .select(
      "id, course_id, title, area, instructor, capacity, starts_at, ends_at, seats_remaining",
    )
    .eq("id", id)
    .maybeSingle();
  if (!session) return null;

  const { data: course } = await admin
    .from("courses")
    .select("stage")
    .eq("id", session.course_id)
    .maybeSingle();
  if (!course || ![1, 2, 3].includes(course.stage)) return null;

  const { data: lessons } = await admin
    .from("session_lessons")
    .select("session_id, starts_at, ends_at, position")
    .eq("session_id", session.id)
    .order("position");

  return toPublicSession(
    session as SessionRow,
    course.stage as CourseStage,
    (lessons ?? []) as LessonRow[],
  );
}

export async function hasValidReferralCode(
  code: string | undefined,
): Promise<boolean> {
  if (!code) return false;
  const admin = createSupabaseAdminClient();
  if (!admin) return isDemoMode();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("referral_code", code.toUpperCase())
    .maybeSingle();
  return Boolean(data);
}
