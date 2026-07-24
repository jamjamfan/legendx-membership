import { CheckCircle2, CircleAlert, ExternalLink } from "lucide-react";
import { PortalShell } from "@/components/portal-shell";
import { getIntegrationReadiness } from "@/lib/integrations/readiness";

export const dynamic = "force-dynamic";

export default function AdminIntegrationsPage() {
  const integrations = getIntegrationReadiness();
  const readyCount = integrations.filter((item) => item.ready).length;

  return (
    <PortalShell
      variant="admin"
      activeHref="/admin/integrations"
      userName="LegendX Admin"
    >
      <main className="portal-main">
        <div className="portal-heading">
          <div>
            <p className="eyebrow">Service readiness</p>
            <h1>外部服務狀態</h1>
            <p>
              {readyCount}/{integrations.length} 個整合已備妥；只顯示設定狀態，絕不顯示密鑰。
            </p>
          </div>
          <a
            className="button button-outline"
            href="/api/health"
            rel="noreferrer"
            target="_blank"
          >
            健康檢查
            <ExternalLink size={15} aria-hidden />
          </a>
        </div>

        <section className="integration-grid">
          {integrations.map((item) => (
            <article className="panel integration-card" key={item.key}>
              <div className="integration-card-head">
                <span
                  className={
                    item.ready
                      ? "integration-icon is-ready"
                      : "integration-icon is-pending"
                  }
                >
                  {item.ready ? (
                    <CheckCircle2 size={19} aria-hidden />
                  ) : (
                    <CircleAlert size={19} aria-hidden />
                  )}
                </span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.required ? "正式營運必需" : "可選增值"}</small>
                </span>
              </div>
              <p>{item.purpose}</p>
              <span
                className={`status-badge ${item.ready ? "status-positive" : "status-warning"}`}
              >
                {item.ready ? "已設定" : `待設定 ${item.missing.length} 項`}
              </span>
            </article>
          ))}
        </section>
      </main>
    </PortalShell>
  );
}
