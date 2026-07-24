import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function escapeIcs(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function icsDate(value: string): string {
  return new Date(value)
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/, "Z");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const server = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!server || !admin) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  const { data: order } = await admin
    .from("orders")
    .select("id, order_number, session_id")
    .eq("id", orderId)
    .eq("member_id", user.id)
    .eq("status", "paid")
    .maybeSingle();
  if (!order) {
    return NextResponse.json({ error: "paid_order_not_found" }, { status: 404 });
  }

  const [{ data: session }, { data: lessons }] = await Promise.all([
    admin
      .from("course_sessions")
      .select("title, area, venue_name, full_address")
      .eq("id", order.session_id)
      .maybeSingle(),
    admin
      .from("session_lessons")
      .select("id, title, starts_at, ends_at")
      .eq("session_id", order.session_id)
      .order("position"),
  ]);
  if (!session || !lessons?.length) {
    return NextResponse.json({ error: "schedule_not_found" }, { status: 404 });
  }

  const location = [session.venue_name, session.full_address, session.area]
    .filter(Boolean)
    .join(" · ");
  const stamp = icsDate(new Date().toISOString());
  const events = lessons
    .map(
      (lesson) => `BEGIN:VEVENT
UID:${lesson.id}@legendx.hk
DTSTAMP:${stamp}
DTSTART:${icsDate(lesson.starts_at)}
DTEND:${icsDate(lesson.ends_at)}
SUMMARY:${escapeIcs(`${session.title} · ${lesson.title}`)}
LOCATION:${escapeIcs(location)}
DESCRIPTION:${escapeIcs(`LegendX 訂單 ${order.order_number}。請喺會員中心開啟課堂通行證。`)}
END:VEVENT`,
    )
    .join("\r\n");
  const calendar = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//LegendX//Course Schedule//ZH-HK
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${escapeIcs(session.title)}
${events}
END:VCALENDAR`;

  return new NextResponse(calendar.replaceAll("\n", "\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="legendx-${order.order_number}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
