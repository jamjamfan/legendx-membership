import { notFound } from "next/navigation";
import { CheckInScanner } from "@/components/check-in-scanner";
import { PortalShell } from "@/components/portal-shell";
import { demoSessions } from "@/lib/demo-data";
import { isDemoMode } from "@/lib/runtime";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminCheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; lesson?: string }>;
}) {
  const query = await searchParams;
  const admin = createSupabaseAdminClient();
  let sessionTitle =
    demoSessions.find((session) => session.id === query.session)?.title ??
    demoSessions[0].title;
  let lessonId = "00000000-0000-4000-8000-000000000001";
  let lessonTitle = `${sessionTitle} · 全日課堂`;

  if (admin) {
    const { data: session } = await admin
      .from("course_sessions")
      .select("id, title")
      .eq("id", query.session ?? "")
      .maybeSingle();
    if (!session) notFound();
    const { data: lessons } = await admin
      .from("session_lessons")
      .select("id, title")
      .eq("session_id", session.id)
      .order("position");
    const lesson =
      lessons?.find((item) => item.id === query.lesson) ?? lessons?.[0];
    if (!lesson) notFound();
    sessionTitle = session.title;
    lessonId = lesson.id;
    lessonTitle = lesson.title;
  } else if (!isDemoMode()) {
    notFound();
  }

  return (
    <PortalShell
      variant="admin"
      activeHref="/admin/sessions"
      userName="LegendX Admin"
    >
      <main className="portal-main">
        <div className="portal-heading">
          <div>
            <p className="eyebrow">Secure attendance</p>
            <h1>掃碼簽到</h1>
            <p>{sessionTitle} · 每位學員每堂只可成功一次。</p>
          </div>
        </div>
        <CheckInScanner lessonId={lessonId} lessonTitle={lessonTitle} />
      </main>
    </PortalShell>
  );
}
