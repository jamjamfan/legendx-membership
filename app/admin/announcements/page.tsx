import { sendAnnouncement } from "@/app/admin/actions";
import { PortalShell } from "@/components/portal-shell";
import { getStaffContext } from "@/lib/auth/staff";
import { demoSessions } from "@/lib/demo-data";
import { isDemoMode } from "@/lib/runtime";

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const query = await searchParams;
  const context = await getStaffContext();
  const demo = isDemoMode() && !context;
  let sessions = demo
    ? demoSessions.map((session) => ({
        id: session.id,
        title: session.title,
      }))
    : [];
  let announcements = demo
    ? [
        {
          id: "demo",
          title: "8 月班上堂準備",
          detail: "會員中心 17/17 · Email 17/17 · WhatsApp 12/12",
        },
      ]
    : [];

  if (context) {
    const [{ data: liveSessions }, { data: liveAnnouncements }] =
      await Promise.all([
        context.admin
          .from("course_sessions")
          .select("id, title")
          .in("status", ["published", "full"])
          .order("starts_at"),
        context.admin
          .from("announcements")
          .select("id, title, channels, published_at")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
    sessions = liveSessions ?? [];
    announcements = (liveAnnouncements ?? []).map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      detail: `${announcement.channels.join(" · ")} · ${
        announcement.published_at ? "已發佈" : "待發送"
      }`,
    }));
  }

  return (
    <PortalShell
      variant="admin"
      activeHref="/admin/announcements"
      userName="LegendX Admin"
    >
      <main className="portal-main">
        <div className="portal-heading">
          <div>
            <p className="eyebrow">Announcements</p>
            <h1>場次公告</h1>
            <p>經會員中心、電郵同已同意嘅 WhatsApp 發送。</p>
          </div>
        </div>
        {query.error && <div className="form-alert is-error">{query.error}</div>}
        {query.success && (
          <div className="form-alert is-success">{query.success}</div>
        )}
        <div className="portal-grid portal-grid-2 admin-form-layout">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>建立公告</h2>
                <p>正式版會先預覽收件人數</p>
              </div>
            </div>
            <form action={sendAnnouncement} className="form-stack">
              <label>
                <span>目標場次</span>
                <select defaultValue={sessions[0]?.id ?? "all"} name="sessionId">
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.title}
                    </option>
                  ))}
                  <option value="all">全部會員</option>
                </select>
              </label>
              <label>
                <span>標題</span>
                <input
                  name="title"
                  placeholder="例如：上堂地點及準備事項"
                  required
                />
              </label>
              <label>
                <span>內容</span>
                <textarea name="body" placeholder="公告內容" required />
              </label>
              <fieldset className="consent-fields">
                <legend>發送渠道</legend>
                <label>
                  <input defaultChecked name="channels" type="checkbox" value="in_app" />
                  <span>會員中心</span>
                </label>
                <label>
                  <input defaultChecked name="channels" type="checkbox" value="email" />
                  <span>Email</span>
                </label>
                <label>
                  <input name="channels" type="checkbox" value="whatsapp" />
                  <span>WhatsApp（只發送俾已同意會員）</span>
                </label>
              </fieldset>
              <button className="button button-dark" type="submit">
                發佈並加入發送佇列
              </button>
            </form>
          </section>
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>最近公告</h2>
                <p>投遞狀態及失敗重試</p>
              </div>
            </div>
            {announcements.map((announcement) => (
              <div className="list-row" key={announcement.id}>
                <span className="list-copy">
                  <strong>{announcement.title}</strong>
                  <small>{announcement.detail}</small>
                </span>
                <span className="status-badge status-positive">已建立</span>
              </div>
            ))}
          </section>
        </div>
      </main>
    </PortalShell>
  );
}
