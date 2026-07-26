import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { publishPromo } from "@/app/admin/actions";
import { PortalShell } from "@/components/portal-shell";
import { getStaffContext } from "@/lib/auth/staff";

export default async function AdminPromoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const query = await searchParams;
  const context = await getStaffContext();
  const { data: current } = context
    ? await context.admin
        .from("promo_content")
        .select(
          "version, headline, subheadline, benefits, brand_story, published_at",
        )
        .eq("status", "published")
        .maybeSingle()
    : { data: null };
  const benefits = Array.isArray(current?.benefits)
    ? current.benefits.filter((item): item is string => typeof item === "string")
    : [];

  return (
    <PortalShell
      variant="admin"
      activeHref="/admin/promo"
      userName="LegendX Admin"
    >
      <main className="portal-main">
        <div className="portal-heading">
          <div>
            <p className="eyebrow">Promo content</p>
            <h1>推廣頁內容</h1>
            <p>結構化欄位、版本記錄及發佈預覽；不接受任意 HTML。</p>
          </div>
          <div className="portal-actions">
            <Link
              className="button button-outline"
              href="/p/GOLD8888"
              target="_blank"
            >
              <ExternalLink size={15} aria-hidden />
              預覽會員頁
            </Link>
          </div>
        </div>
        {query.error && <div className="form-alert is-error">{query.error}</div>}
        {query.success && (
          <div className="form-alert is-success">{query.success}</div>
        )}
        <div className="portal-grid portal-grid-2 admin-form-layout">
          <section className="panel">
            <form action={publishPromo} className="form-stack">
              <label>
                <span>主標題</span>
                <input
                  defaultValue={current?.headline ?? "由學識，到成就別人"}
                  name="headline"
                  required
                />
              </label>
              <label>
                <span>副標題</span>
                <textarea
                  defaultValue={
                    current?.subheadline ??
                    "三階段專業進階路線，將學習、實踐與傳承連成一套完整系統。"
                  }
                  name="subheadline"
                  required
                />
              </label>
              <label>
                <span>賣點 1</span>
                <input
                  defaultValue={benefits[0] ?? "建立清晰方向"}
                  name="benefit1"
                  required
                />
              </label>
              <label>
                <span>賣點 2</span>
                <input
                  defaultValue={benefits[1] ?? "將方法轉化為成果"}
                  name="benefit2"
                  required
                />
              </label>
              <label>
                <span>賣點 3</span>
                <input
                  defaultValue={
                    benefits[2] ?? "獲得可追蹤的獎學金名額"
                  }
                  name="benefit3"
                  required
                />
              </label>
              <label>
                <span>品牌介紹</span>
                <textarea
                  defaultValue={
                    current?.brand_story ??
                    "LegendX 相信，真正有價值的學習，會從個人成長延伸至成就身邊的人。"
                  }
                  name="brandStory"
                  required
                />
              </label>
              <div className="action-cell">
                <button className="button button-dark" type="submit">
                  發佈更新
                </button>
              </div>
            </form>
          </section>
          <section className="panel version-panel">
            <div className="panel-header">
              <div>
                <h2>版本記錄</h2>
                <p>所有會員推廣頁共用已發佈版本</p>
              </div>
            </div>
            <div className="list-row">
              <span className="list-copy">
                <strong>第 {current?.version ?? 1} 版</strong>
                <small>
                  {current?.published_at
                    ? new Intl.DateTimeFormat("zh-HK", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Asia/Hong_Kong",
                      }).format(new Date(current.published_at))
                    : "開發預覽"}{" "}
                  · LegendX Admin
                </small>
              </span>
              <span className="status-badge status-positive">已發佈</span>
            </div>
          </section>
        </div>
      </main>
    </PortalShell>
  );
}
