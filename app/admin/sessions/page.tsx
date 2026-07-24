import { CalendarPlus, Download, QrCode, UserPlus } from "lucide-react";
import Link from "next/link";
import {
  cancelSession,
  createSession,
  inviteWaitlistEntry,
  updateSession,
} from "@/app/admin/actions";
import { DemoActionButton } from "@/components/demo-action-button";
import { PortalShell } from "@/components/portal-shell";
import { demoSessions } from "@/lib/demo-data";
import { getStaffContext } from "@/lib/auth/staff";
import { isDemoMode } from "@/lib/runtime";

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    success?: string;
    create?: string;
    edit?: string;
    waitlist?: string;
  }>;
}) {
  const query = await searchParams;
  const context = await getStaffContext();
  const demo = isDemoMode() && !context;
  let sessions: Array<{
    id: string;
    stage: number;
    title: string;
    dateLabel: string;
    timeLabel: string;
    area: string;
    venue: string;
    instructor: string;
    capacity: number;
    enrolled: number;
    seatsRemaining: number;
    waitlistCount: number;
    live: boolean;
  }> = demo
    ? demoSessions.map((session) => ({
        ...session,
        waitlistCount: 0,
        live: false,
      }))
    : [];
  let editSession: {
    id: string;
    stage: number;
    title: string;
    area: string;
    venueName: string;
    fullAddress: string;
    instructor: string;
    capacity: number;
    status: "draft" | "published" | "full" | "completed";
    startsAt: string;
    endsAt: string;
  } | null = null;
  let waitlist: Array<{
    id: string;
    name: string;
    phone: string;
    email: string | null;
    status: string;
    createdAt: string;
  }> = [];

  if (context) {
    const [
      { data: rows },
      { data: courses },
      { data: waitlistRows },
      { data: editRow },
      { data: selectedWaitlist },
    ] = await Promise.all([
      context.admin
        .from("public_course_sessions")
        .select(
          "id, course_id, title, area, instructor, capacity, starts_at, ends_at, seats_remaining",
        )
        .order("starts_at"),
      context.admin.from("courses").select("id, stage"),
      context.admin
        .from("waitlist_entries")
        .select("session_id")
        .in("status", ["waiting", "invited"]),
      query.edit
        ? context.admin
            .from("course_sessions")
            .select(
              "id, course_id, title, area, venue_name, full_address, instructor, capacity, status, starts_at, ends_at",
            )
            .eq("id", query.edit)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      query.waitlist
        ? context.admin
            .from("waitlist_entries")
            .select("id, name, phone, email, status, created_at")
            .eq("session_id", query.waitlist)
            .in("status", ["waiting", "invited"])
            .order("created_at")
        : Promise.resolve({ data: [] }),
    ]);
    const stages = new Map((courses ?? []).map((item) => [item.id, item.stage]));
    const waitlistCounts = new Map<string, number>();
    for (const row of waitlistRows ?? []) {
      waitlistCounts.set(
        row.session_id,
        (waitlistCounts.get(row.session_id) ?? 0) + 1,
      );
    }
    const dateFormatter = new Intl.DateTimeFormat("zh-HK", {
      dateStyle: "long",
      timeZone: "Asia/Hong_Kong",
    });
    const timeFormatter = new Intl.DateTimeFormat("zh-HK", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Hong_Kong",
    });
    sessions = (rows ?? []).map((session) => {
      const startsAt = new Date(session.starts_at);
      const endsAt = new Date(session.ends_at);
      return {
        id: session.id,
        stage: stages.get(session.course_id) ?? 1,
        title: session.title,
        dateLabel: dateFormatter.format(startsAt),
        timeLabel: `${timeFormatter.format(startsAt)}–${timeFormatter.format(endsAt)}`,
        area: session.area,
        venue: "",
        instructor: session.instructor,
        capacity: session.capacity,
        enrolled: session.capacity - session.seats_remaining,
        seatsRemaining: session.seats_remaining,
        waitlistCount: waitlistCounts.get(session.id) ?? 0,
        live: true,
      };
    });
    if (editRow && editRow.status !== "cancelled") {
      const localDateTime = (value: string) =>
        new Intl.DateTimeFormat("sv-SE", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Asia/Hong_Kong",
        })
          .format(new Date(value))
          .replace(" ", "T");
      editSession = {
        id: editRow.id,
        stage: stages.get(editRow.course_id) ?? 1,
        title: editRow.title,
        area: editRow.area,
        venueName: editRow.venue_name ?? "",
        fullAddress: editRow.full_address ?? "",
        instructor: editRow.instructor,
        capacity: editRow.capacity,
        status: editRow.status as
          | "draft"
          | "published"
          | "full"
          | "completed",
        startsAt: localDateTime(editRow.starts_at),
        endsAt: localDateTime(editRow.ends_at),
      };
    }
    waitlist = (selectedWaitlist ?? []).map((entry) => ({
      id: entry.id,
      name: entry.name,
      phone: entry.phone,
      email: entry.email,
      status: entry.status,
      createdAt: new Intl.DateTimeFormat("zh-HK", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Hong_Kong",
      }).format(new Date(entry.created_at)),
    }));
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
            <p className="eyebrow">Sessions & attendance</p>
            <h1>場次與出席</h1>
            <p>開班、容量、候補、課堂日子同簽到。</p>
          </div>
          <div className="portal-actions">
            <Link
              className="button button-outline"
              href="/api/admin/export/attendance"
            >
              <Download size={15} aria-hidden />
              匯出出席
            </Link>
            <Link className="button button-dark" href="/admin/sessions?create=1">
              <CalendarPlus size={15} aria-hidden />
              新增場次
            </Link>
          </div>
        </div>
        {query.error && <div className="form-alert is-error">{query.error}</div>}
        {query.success && (
          <div className="form-alert is-success">{query.success}</div>
        )}
        {query.create && (
          <section className="panel" style={{ marginBottom: "1rem" }}>
            <div className="panel-header">
              <div>
                <h2>新增正式場次</h2>
                <p>時間以香港時區記錄；可同時建立 Zoom 會議。</p>
              </div>
            </div>
            <form action={createSession} className="form-stack form-grid-2">
              <label>
                <span>課程階段</span>
                <select name="stage" defaultValue="1">
                  <option value="1">第一階段</option>
                  <option value="2">第二階段</option>
                  <option value="3">第三階段</option>
                </select>
              </label>
              <label>
                <span>場次標題</span>
                <input name="title" required />
              </label>
              <label>
                <span>開始</span>
                <input name="startsAt" required type="datetime-local" />
              </label>
              <label>
                <span>完結</span>
                <input name="endsAt" required type="datetime-local" />
              </label>
              <label>
                <span>地區</span>
                <input name="area" required />
              </label>
              <label>
                <span>場地名稱</span>
                <input name="venueName" />
              </label>
              <label className="form-grid-span-2">
                <span>完整地址（只向已付款學員顯示）</span>
                <input name="fullAddress" />
              </label>
              <label>
                <span>導師</span>
                <input name="instructor" required />
              </label>
              <label>
                <span>名額</span>
                <input name="capacity" min="1" required type="number" />
              </label>
              <label className="inline-check form-grid-span-2">
                <input name="createZoom" type="checkbox" />
                <span>同時建立 Zoom 會議（須已設定 Zoom）</span>
              </label>
              <button className="button button-dark" type="submit">
                建立場次
              </button>
            </form>
          </section>
        )}
        {editSession && (
          <section className="panel" style={{ marginBottom: "1rem" }}>
            <div className="panel-header">
              <div>
                <h2>編輯場次</h2>
                <p>更新時間會同步第一堂課；取消場次會通知已付款學員。</p>
              </div>
            </div>
            <form action={updateSession} className="form-stack form-grid-2">
              <input name="sessionId" type="hidden" value={editSession.id} />
              <label>
                <span>課程階段</span>
                <select name="stage" defaultValue={editSession.stage}>
                  <option value="1">第一階段</option>
                  <option value="2">第二階段</option>
                  <option value="3">第三階段</option>
                </select>
              </label>
              <label>
                <span>場次狀態</span>
                <select name="status" defaultValue={editSession.status}>
                  <option value="draft">草稿</option>
                  <option value="published">招生中</option>
                  <option value="full">已滿</option>
                  <option value="completed">已完成</option>
                </select>
              </label>
              <label className="form-grid-span-2">
                <span>場次標題</span>
                <input
                  defaultValue={editSession.title}
                  name="title"
                  required
                />
              </label>
              <label>
                <span>開始</span>
                <input
                  defaultValue={editSession.startsAt}
                  name="startsAt"
                  required
                  type="datetime-local"
                />
              </label>
              <label>
                <span>完結</span>
                <input
                  defaultValue={editSession.endsAt}
                  name="endsAt"
                  required
                  type="datetime-local"
                />
              </label>
              <label>
                <span>地區</span>
                <input defaultValue={editSession.area} name="area" required />
              </label>
              <label>
                <span>場地名稱</span>
                <input
                  defaultValue={editSession.venueName}
                  name="venueName"
                />
              </label>
              <label className="form-grid-span-2">
                <span>完整地址</span>
                <input
                  defaultValue={editSession.fullAddress}
                  name="fullAddress"
                />
              </label>
              <label>
                <span>導師</span>
                <input
                  defaultValue={editSession.instructor}
                  name="instructor"
                  required
                />
              </label>
              <label>
                <span>名額</span>
                <input
                  defaultValue={editSession.capacity}
                  min="1"
                  name="capacity"
                  required
                  type="number"
                />
              </label>
              <button className="button button-dark" type="submit">
                儲存場次
              </button>
            </form>
            <form action={cancelSession} style={{ marginTop: "1rem" }}>
              <input name="sessionId" type="hidden" value={editSession.id} />
              <button className="button button-outline" type="submit">
                取消場次並通知學員
              </button>
            </form>
          </section>
        )}
        {query.waitlist && (
          <section className="panel" style={{ marginBottom: "1rem" }}>
            <div className="panel-header">
              <div>
                <h2>候補名單</h2>
                <p>按加入次序邀請；每次邀請有效 24 小時。</p>
              </div>
            </div>
            <div className="table-list">
              {waitlist.length > 0 ? (
                waitlist.map((entry) => (
                  <div className="table-row" key={entry.id}>
                    <div>
                      <strong>{entry.name}</strong>
                      <small>
                        {entry.phone}
                        {entry.email ? ` · ${entry.email}` : ""}
                      </small>
                    </div>
                    <span>{entry.createdAt}</span>
                    <span className="status-badge">{entry.status}</span>
                    {entry.status === "waiting" ? (
                      <form action={inviteWaitlistEntry}>
                        <input
                          name="waitlistId"
                          type="hidden"
                          value={entry.id}
                        />
                        <button className="table-action" type="submit">
                          發出 24 小時邀請
                        </button>
                      </form>
                    ) : (
                      <span>已邀請</span>
                    )}
                  </div>
                ))
              ) : (
                <p className="empty-state">暫時未有候補。</p>
              )}
            </div>
          </section>
        )}
        <section className="session-admin-grid">
          {sessions.map((session) => {
            const percent = Math.round(
              (session.enrolled / session.capacity) * 100,
            );
            return (
              <article className="panel session-admin-card" key={session.id}>
                <div className="panel-header">
                  <div>
                    <span className="stage-number">
                      STAGE {String(session.stage).padStart(2, "0")}
                    </span>
                    <h2>{session.title}</h2>
                  </div>
                  <span
                    className={`status-badge ${session.seatsRemaining > 0 ? "status-positive" : "status-warning"}`}
                  >
                    {session.seatsRemaining > 0 ? "招生中" : "已滿"}
                  </span>
                </div>
                <div className="session-admin-facts">
                  <span>{session.dateLabel}</span>
                  <span>{session.timeLabel}</span>
                  <span>{session.area}</span>
                  <span>{session.instructor}</span>
                </div>
                <div className="capacity-bar">
                  <span>
                    <strong>{session.enrolled}</strong> / {session.capacity} 已報名
                  </span>
                  <div>
                    <i style={{ width: `${percent}%` }} />
                  </div>
                </div>
                <div className="session-admin-actions">
                  {session.live ? (
                    <Link className="table-action" href={`/admin/sessions?edit=${session.id}`}>
                      編輯
                    </Link>
                  ) : (
                    <DemoActionButton label="編輯" doneLabel="已儲存" />
                  )}
                  <Link
                    className="table-action"
                    href={`/admin/check-in?session=${session.id}`}
                  >
                    <QrCode size={13} aria-hidden />
                    掃碼簽到
                  </Link>
                  {(session.seatsRemaining === 0 ||
                    session.waitlistCount > 0) && (
                    <Link
                      className="table-action"
                      href={`/admin/sessions?waitlist=${session.id}`}
                    >
                      <UserPlus size={13} aria-hidden />
                      候補名單 {session.waitlistCount}
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </PortalShell>
  );
}
