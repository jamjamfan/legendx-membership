import { demoSessions } from "@/lib/demo-data";
import type { CourseStage } from "@/lib/domain/catalog";
import { isDemoMode } from "@/lib/runtime";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  course_id?: string;
  stage?: number;
  title: string;
  area: string;
  instructor: string;
  capacity: number;
  starts_at: string;
  ends_at: string;
  enrollment_closes_at?: string | null;
  seats_remaining: number;
  lessons?: LessonRow[];
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
  const server = await createSupabaseServerClient();
  if (!server) {
    if (!isDemoMode()) return [];
    return demoSessions
      .filter((session) => session.stage === stage)
      .map((session) => ({ ...session }));
  }

  const { data, error } = await server.rpc("list_public_course_sessions", {
    p_stage: stage,
  });
  if (error) {
    console.error("Unable to load public course sessions", {
      code: error.code,
    });
    return [];
  }

  return ((data ?? []) as SessionRow[]).map((session) =>
    toPublicSession(session, stage, session.lessons ?? []),
  );
}

export async function getPublicSessionById(
  id: string | undefined,
): Promise<PublicSession | null> {
  if (!id) return null;
  const server = await createSupabaseServerClient();
  if (!server) {
    if (!isDemoMode()) return null;
    const session = demoSessions.find((item) => item.id === id);
    return session ? { ...session } : null;
  }

  const { data, error } = await server.rpc("list_public_course_sessions", {
    p_stage: null,
  });
  if (error) return null;
  const session = ((data ?? []) as SessionRow[]).find(
    (item) => item.id === id,
  );
  if (!session) return null;
  if (!session.stage || ![1, 2, 3].includes(session.stage)) return null;

  return toPublicSession(
    session,
    session.stage as CourseStage,
    session.lessons ?? [],
  );
}

export async function hasValidReferralCode(
  code: string | undefined,
): Promise<boolean> {
  if (!code) return false;
  const server = await createSupabaseServerClient();
  if (!server) return isDemoMode();
  const { data, error } = await server.rpc("is_valid_referral_code", {
    p_code: code,
  });
  if (error) return false;
  return Boolean(data);
}
