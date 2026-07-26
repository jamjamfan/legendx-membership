import { Download, Search } from "lucide-react";
import Link from "next/link";
import { advanceMemberStage } from "@/app/admin/actions";
import { PortalShell } from "@/components/portal-shell";
import { SubmitButton } from "@/components/submit-button";
import { getStaffContext } from "@/lib/auth/staff";
import { formatHkd } from "@/lib/domain/catalog";
import { isDemoMode } from "@/lib/runtime";

const demoMembers = [
  ["陳嘉明", "member@legendx.hk", "9123 4567", "第二階段", "王小敏", "$3,000"],
  ["王小敏", "samantha@example.com", "6333 2018", "第一階段", "陳嘉明", "$0"],
  ["李俊豪", "junho@example.com", "9881 8802", "第一階段", "陳嘉明", "$0"],
  ["黃志文", "chi.man@example.com", "6118 2234", "第一階段", "—", "$0"],
] as const;

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const query = await searchParams;
  const context = await getStaffContext();
  const demo = isDemoMode() && !context;
  let members: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    stage: string;
    completedStage: number;
    referrer: string;
    scholarship: string;
    live: boolean;
  }> = demo
    ? demoMembers.map((member, index) => ({
        id: member[1],
        name: member[0],
        email: member[1],
        phone: member[2],
        stage: member[3],
        completedStage: index === 0 ? 2 : 1,
        referrer: member[4],
        scholarship: member[5],
        live: false,
      }))
    : [];

  if (context) {
    const [{ data: profiles }, { data: ledger }] = await Promise.all([
      context.admin
        .from("profiles")
        .select(
          "id, display_name, email, phone, highest_completed_stage, referrer_id",
        )
        .order("created_at", { ascending: false }),
      context.admin
        .from("rebate_ledger_entries")
        .select("member_id, amount_cents"),
    ]);
    const names = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile.display_name]),
    );
    const totals = new Map<string, number>();
    for (const entry of ledger ?? []) {
      totals.set(
        entry.member_id,
        (totals.get(entry.member_id) ?? 0) + entry.amount_cents,
      );
    }
    const stageNames = ["未開始", "第一階段", "第二階段", "第三階段"];
    members = (profiles ?? []).map((profile) => ({
      id: profile.id,
      name: profile.display_name,
      email: profile.email,
      phone: profile.phone ?? "—",
      stage: stageNames[profile.highest_completed_stage] ?? "未開始",
      completedStage: profile.highest_completed_stage,
      referrer: profile.referrer_id
        ? names.get(profile.referrer_id) ?? "LegendX 會員"
        : "—",
      scholarship: formatHkd((totals.get(profile.id) ?? 0) / 100),
      live: true,
    }));
  }

  return (
    <PortalShell
      variant="admin"
      activeHref="/admin/members"
      userName="LegendX Admin"
    >
      <main className="portal-main">
        <div className="portal-heading">
          <div>
            <p className="eyebrow">Members</p>
            <h1>會員管理</h1>
            <p>會員階段、介紹人、聯絡資料同累計獎學金。</p>
          </div>
          <div className="portal-actions">
            <Link
              className="button button-outline"
              href="/api/admin/export/members"
            >
              <Download size={15} aria-hidden />
              匯出 CSV
            </Link>
          </div>
        </div>
        {query.error && <div className="form-alert is-error">{query.error}</div>}
        {query.success && (
          <div className="form-alert is-success">{query.success}</div>
        )}
        <section className="panel">
          <div className="table-toolbar">
            <label>
              <Search size={15} aria-hidden />
              <input aria-label="搜尋會員" placeholder="搜尋姓名、電郵或電話" />
            </label>
            <select aria-label="按階段篩選" className="field-control">
              <option>全部階段</option>
              <option>第一階段</option>
              <option>第二階段</option>
              <option>第三階段</option>
            </select>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>會員</th>
                  <th>電話</th>
                  <th>最高階段</th>
                  <th>介紹人</th>
                  <th>累計獎學金</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <strong>{member.name}</strong>
                      <small>{member.email}</small>
                    </td>
                    <td>{member.phone}</td>
                    <td>{member.stage}</td>
                    <td>{member.referrer}</td>
                    <td>{member.scholarship}</td>
                    <td>
                      {member.live && member.completedStage < 3 ? (
                        <form action={advanceMemberStage}>
                          <input
                            name="memberId"
                            type="hidden"
                            value={member.id}
                          />
                          <input
                            name="stage"
                            type="hidden"
                            value={member.completedStage + 1}
                          />
                          <SubmitButton
                            className="table-action"
                            pendingLabel="更新中…"
                          >
                            測試完成第 {member.completedStage + 1} 階段
                          </SubmitButton>
                        </form>
                      ) : (
                        <span className="status-badge status-neutral">
                          {member.completedStage >= 3 ? "全部完成" : "示範資料"}
                        </span>
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
