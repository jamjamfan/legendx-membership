import { DemoActionButton } from "@/components/demo-action-button";
import { settleRebate } from "@/app/admin/actions";
import { PortalShell } from "@/components/portal-shell";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { demoRebates } from "@/lib/demo-data";
import { getRebateAttendanceStatus } from "@/lib/data/rebate-attendance";
import { formatHkd } from "@/lib/domain/catalog";
import type { RebateStatus } from "@/lib/domain/models";
import { getStaffContext } from "@/lib/auth/staff";
import { isDemoMode } from "@/lib/runtime";

export default async function AdminRebatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const query = await searchParams;
  const context = await getStaffContext();
  const demo = isDemoMode() && !context;
  let rebates = demo
    ? demoRebates.map((rebate) => ({
        ...rebate,
        referrer: "陳嘉明",
        programme: "第二階段",
        attendance: {
          totalLessons: 3,
          checkedInLessons: 3,
          completedLessons: 3,
          totalMinutes: 630,
          eligible: true,
        },
        live: false,
      }))
    : [];

  if (context) {
    const { data: rows } = await context.admin
      .from("rebate_records")
      .select(
        "id, batch_id, referrer_id, referred_member_id, referred_order_id, slot_index, amount_cents, status, created_at",
      )
      .order("created_at", { ascending: false });
    const profileIds = [
      ...new Set(
        (rows ?? []).flatMap((row) => [
          row.referrer_id,
          row.referred_member_id,
        ]),
      ),
    ];
    const batchIds = [...new Set((rows ?? []).map((row) => row.batch_id))];
    const [{ data: profiles }, { data: batches }] = await Promise.all([
      profileIds.length
        ? context.admin
            .from("profiles")
            .select("id, display_name")
            .in("id", profileIds)
        : Promise.resolve({ data: [] }),
      batchIds.length
        ? context.admin
            .from("referral_batches")
            .select("id, programme")
            .in("id", batchIds)
        : Promise.resolve({ data: [] }),
    ]);
    const names = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile.display_name]),
    );
    const programmes = new Map(
      (batches ?? []).map((batch) => [batch.id, batch.programme]),
    );
    rebates = await Promise.all(
      (rows ?? []).map(async (row) => ({
        id: row.id,
        referrer: names.get(row.referrer_id) ?? "LegendX 會員",
        friend: names.get(row.referred_member_id) ?? "LegendX 會員",
        slotIndex: row.slot_index,
        amount: row.amount_cents / 100,
        status: row.status as RebateStatus,
        createdAt: row.created_at,
        programme:
          programmes.get(row.batch_id) === "stage_3"
            ? "第三階段"
            : "第二階段",
        attendance: await getRebateAttendanceStatus(
          context.admin,
          row.referred_order_id,
          row.referred_member_id,
        ),
        live: true,
      })),
    );
  }

  const pendingAmount = rebates
    .filter((rebate) => rebate.status === "pending")
    .reduce((sum, rebate) => sum + rebate.amount, 0);
  const settledAmount = rebates
    .filter((rebate) => rebate.status === "settled")
    .reduce((sum, rebate) => sum + rebate.amount, 0);
  const reversalAmount = rebates
    .filter((rebate) => rebate.status === "reversal_due")
    .reduce((sum, rebate) => sum + rebate.amount, 0);

  return (
    <PortalShell
      variant="admin"
      activeHref="/admin/rebates"
      userName="LegendX Admin"
    >
      <main className="portal-main">
        <div className="portal-heading">
          <div>
            <p className="eyebrow">Scholarship ledger</p>
            <h1>獎學金結算</h1>
            <p>名額、朋友訂單、回贈金額同負結餘。</p>
          </div>
        </div>
        {query.error && <div className="form-alert is-error">{query.error}</div>}
        {query.success && (
          <div className="form-alert is-success">{query.success}</div>
        )}
        <section className="portal-grid portal-grid-3">
          <article className="metric-card">
            <small>待結算</small>
            <span className="metric-value">{formatHkd(pendingAmount)}</span>
            <span className="metric-note">
              {rebates.filter((rebate) => rebate.status === "pending").length} 筆
            </span>
          </article>
          <article className="metric-card">
            <small>本月已結算</small>
            <span className="metric-value">{formatHkd(settledAmount)}</span>
            <span className="metric-note">12 筆</span>
          </article>
          <article className="metric-card">
            <small>待抵扣負結餘</small>
            <span className="metric-value">−{formatHkd(reversalAmount)}</span>
            <span className="metric-note is-warning">1 位會員</span>
          </article>
        </section>
        <section className="panel" style={{ marginTop: "1rem" }}>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>介紹人</th>
                  <th>朋友</th>
                  <th>名額</th>
                  <th>金額</th>
                  <th>朋友出席</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {rebates.map((rebate) => (
                  <tr key={rebate.id}>
                    <td>{rebate.referrer}</td>
                    <td>{rebate.friend}</td>
                    <td>{rebate.programme} · {rebate.slotIndex}</td>
                    <td>{formatHkd(rebate.amount)}</td>
                    <td>
                      <strong>
                        {rebate.attendance.completedLessons}/
                        {rebate.attendance.totalLessons} 堂已完成
                      </strong>
                      <small>
                        {rebate.attendance.totalMinutes > 0
                          ? `${Math.floor(rebate.attendance.totalMinutes / 60)} 小時 ${rebate.attendance.totalMinutes % 60} 分鐘`
                          : rebate.attendance.checkedInLessons > 0
                            ? "已有入場，等待離場"
                            : "未有出席記錄"}
                      </small>
                    </td>
                    <td>
                      <StatusBadge status={rebate.status} />
                    </td>
                    <td>
                      {rebate.status === "pending" ? (
                        rebate.live && rebate.attendance.eligible ? (
                          <form action={settleRebate}>
                            <input name="rebateId" type="hidden" value={rebate.id} />
                            <SubmitButton
                              className="table-action"
                              pendingLabel="結算中…"
                            >
                              標記已過數
                            </SubmitButton>
                          </form>
                        ) : !rebate.live ? (
                          <DemoActionButton
                            label="標記已過數"
                            doneLabel="已結算"
                          />
                        ) : (
                          <button className="table-action" disabled type="button">
                            等待完整出席
                          </button>
                        )
                      ) : (
                        <button className="table-action" type="button">
                          查看記錄
                        </button>
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
