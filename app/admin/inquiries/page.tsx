import { DemoActionButton } from "@/components/demo-action-button";
import { updateInquiry } from "@/app/admin/actions";
import { PortalShell } from "@/components/portal-shell";
import { StatusBadge } from "@/components/status-badge";
import { demoInquiries } from "@/lib/demo-data";
import type { InquiryStatus } from "@/lib/domain/models";
import { getStaffContext } from "@/lib/auth/staff";
import { isDemoMode } from "@/lib/runtime";

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const query = await searchParams;
  const context = await getStaffContext();
  const demo = isDemoMode() && !context;
  let inquiries = demo
    ? demoInquiries.map((lead) => ({
        ...lead,
        referrer: "陳嘉明 · GOLD8888",
        live: false,
      }))
    : [];

  if (context) {
    const { data: rows } = await context.admin
      .from("inquiries")
      .select("id, referrer_id, name, phone, message, status, created_at")
      .order("created_at", { ascending: false });
    const referrerIds = [...new Set((rows ?? []).map((row) => row.referrer_id))];
    const { data: profiles } =
      referrerIds.length > 0
        ? await context.admin
            .from("profiles")
            .select("id, display_name, referral_code")
            .in("id", referrerIds)
        : { data: [] };
    const referrers = new Map(
      (profiles ?? []).map((profile) => [
        profile.id,
        `${profile.display_name} · ${profile.referral_code}`,
      ]),
    );
    inquiries = (rows ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      message: row.message ?? "",
      status: row.status as InquiryStatus,
      createdAt: new Intl.DateTimeFormat("zh-HK", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Hong_Kong",
      }).format(new Date(row.created_at)),
      referrer: referrers.get(row.referrer_id) ?? "LegendX 會員",
      live: true,
    }));
  }

  return (
    <PortalShell
      variant="admin"
      activeHref="/admin/inquiries"
      userName="LegendX Admin"
    >
      <main className="portal-main">
        <div className="portal-heading">
          <div>
            <p className="eyebrow">Lead tracking</p>
            <h1>查詢跟進</h1>
            <p>由會員推廣頁進入嘅查詢及轉化狀態。</p>
          </div>
        </div>
        {query.error && <div className="form-alert is-error">{query.error}</div>}
        {query.success && (
          <div className="form-alert is-success">{query.success}</div>
        )}
        <section className="panel">
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>查詢人</th>
                  <th>歸屬會員</th>
                  <th>內容</th>
                  <th>時間</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <strong>{lead.name}</strong>
                      <small>{lead.phone}</small>
                    </td>
                    <td>{lead.referrer}</td>
                    <td className="wide-cell">{lead.message}</td>
                    <td>{lead.createdAt}</td>
                    <td>
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="action-cell">
                      {lead.live ? (
                        <>
                          <form action={updateInquiry}>
                            <input name="inquiryId" type="hidden" value={lead.id} />
                            <input name="status" type="hidden" value="contacted" />
                            <button className="table-action" type="submit">
                              標記已聯絡
                            </button>
                          </form>
                          <form action={updateInquiry}>
                            <input name="inquiryId" type="hidden" value={lead.id} />
                            <input name="status" type="hidden" value="converted" />
                            <button className="table-action" type="submit">
                              轉化
                            </button>
                          </form>
                        </>
                      ) : (
                        <>
                          <DemoActionButton label="標記已聯絡" doneLabel="已聯絡" />
                          <DemoActionButton label="轉化" doneLabel="已轉化" />
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </PortalShell>
  );
}
