import { isDemoMode } from "@/lib/runtime";

export async function GET() {
  if (!isDemoMode()) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const lessons = [
    ["20260724T110000Z", "20260724T143000Z", "1"],
    ["20260731T110000Z", "20260731T143000Z", "2"],
    ["20260807T110000Z", "20260807T143000Z", "3"],
  ] as const;
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LegendX//Course Calendar//ZH-HK",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...lessons.flatMap(([start, end, lesson]) => [
      "BEGIN:VEVENT",
      `UID:legendx-finance-3-${lesson}@legendx.hk`,
      "DTSTAMP:20260724T040000Z",
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:LegendX 財技 3 班 · Lesson ${lesson}`,
      "DESCRIPTION:請提前 15 分鐘到場並準備課堂通行證。",
      "LOCATION:觀塘鴻圖道 33 號華盛數碼大廈 2303 室",
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="legendx-class.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
