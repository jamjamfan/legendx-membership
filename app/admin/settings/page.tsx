import { ShieldCheck } from "lucide-react";
import { updateSettings } from "@/app/admin/actions";
import { PortalShell } from "@/components/portal-shell";
import { getStaffContext } from "@/lib/auth/staff";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const query = await searchParams;
  const context = await getStaffContext();
  const { data: settings } = context
    ? await context.admin
        .from("settings")
        .select("key, value")
        .in("key", ["scholarship_validity_days", "fps_payment_hold_hours"])
    : { data: [] };
  const values = new Map(
    (settings ?? []).map((item) => [item.key, Number(item.value)]),
  );
  const scholarshipDays = values.get("scholarship_validity_days") ?? 180;
  const paymentHoldHours = values.get("fps_payment_hold_hours") ?? 24;

  return (
    <PortalShell
      variant="admin"
      activeHref="/admin/settings"
      userName="LegendX Admin"
    >
      <main className="portal-main">
        <div className="portal-heading">
          <div>
            <p className="eyebrow">Settings</p>
            <h1>系統設定</h1>
            <p>會影響商業規則嘅設定全部保留修改人同時間。</p>
          </div>
        </div>
        {query.error && <div className="form-alert is-error">{query.error}</div>}
        {query.success && (
          <div className="form-alert is-success">{query.success}</div>
        )}
        <form action={updateSettings} className="panel settings-panel">
          <div className="setting-row">
            <div>
              <strong>獎學金名額有效期</strong>
              <small>由相關階段付款確認日起計</small>
            </div>
            <label>
              <input
                className="field-control"
                defaultValue={scholarshipDays}
                max="730"
                min="1"
                name="scholarshipDays"
                type="number"
              />
              <span>日</span>
            </label>
          </div>
          <div className="setting-row">
            <div>
              <strong>FPS／人工收款座位保留</strong>
              <small>到期仍未確認就釋放座位</small>
            </div>
            <label>
              <input
                className="field-control"
                defaultValue={paymentHoldHours}
                max="168"
                min="1"
                name="paymentHoldHours"
                type="number"
              />
              <span>小時</span>
            </label>
          </div>
          <div className="setting-row">
            <div>
              <strong>上堂提醒</strong>
              <small>每堂分別喺以下時間建立通知工作</small>
            </div>
            <span className="setting-value">T−1 日 · T−3 小時</span>
          </div>
          <div className="setting-row">
            <div>
              <strong>第三階段資格</strong>
              <small>須由職員確認第二階段已完成</small>
            </div>
            <span className="status-badge status-positive">已鎖定</span>
          </div>
          <div className="settings-footer">
            <span>
              <ShieldCheck size={16} aria-hidden />
              正式修改會寫入 audit_logs，並顯示舊值與新值。
            </span>
            <button className="button button-dark" type="submit">
              儲存設定
            </button>
          </div>
        </form>
      </main>
    </PortalShell>
  );
}
