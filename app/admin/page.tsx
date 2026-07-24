import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  ReceiptText,
  RotateCcw,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { DemoActionButton } from "@/components/demo-action-button";
import { PortalShell } from "@/components/portal-shell";
import { StatusBadge } from "@/components/status-badge";
import { getStaffContext } from "@/lib/auth/staff";
import {
  demoDashboardStats,
  demoInquiries,
  demoOrders,
  demoSessions,
} from "@/lib/demo-data";
import { formatHkd } from "@/lib/domain/catalog";
import type {
  InquiryStatus,
  OrderStatus,
} from "@/lib/domain/models";
import { isDemoMode } from "@/lib/runtime";

type QueueItem = {
  id: string;
  kind: "payment" | "refund" | "inquiry";
  title: string;
  detail: string;
  href: string;
};

type SessionCapacity = {
  id: string;
  title: string;
  enrolled: number;
  capacity: number;
};

type RecentActivity = {
  id: string;
  createdAt: string;
  type: string;
  content: string;
  status: OrderStatus | InquiryStatus;
};

function formatActivityTime(value: string) {
  return new Intl.DateTimeFormat("zh-HK", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Hong_Kong",
  }).format(new Date(value));
}

export default async function AdminDashboardPage() {
  const context = await getStaffContext();
  const demo = isDemoMode() && !context;

  let metrics = demo
    ? { ...demoDashboardStats }
    : {
        members: 0,
        pendingPayments: 0,
        pendingRefunds: 0,
        pendingRebatesAmount: 0,
      };
  let queue: QueueItem[] = demo
    ? [
        {
          id: "demo-payment",
          kind: "payment",
          title: "FPS 收款 · LX-202607-1028",
          detail: "黃志文 · 第一階段 · HK$880",
          href: "/admin/orders",
        },
        {
          id: "demo-refund",
          kind: "refund",
          title: "退款申請 · LX-202607-1019",
          detail: "林美玲 · 行程改動 · HK$880",
          href: "/admin/orders",
        },
        {
          id: "demo-inquiry",
          kind: "inquiry",
          title: "新查詢 · 張小姐",
          detail: "想了解第一階段 8 月班係咪仲有位",
          href: "/admin/inquiries",
        },
      ]
    : [];
  let capacities: SessionCapacity[] = demo
    ? demoSessions.map((session) => ({
        id: session.id,
        title: session.title,
        enrolled: session.enrolled,
        capacity: session.capacity,
      }))
    : [];
  let recent: RecentActivity[] = demo
    ? [
        {
          id: demoInquiries[0].id,
          createdAt: "2026-07-24T02:42:00.000Z",
          type: "查詢",
          content: `${demoInquiries[0].name} · 第一階段`,
          status: demoInquiries[0].status,
        },
        {
          id: demoOrders[0].id,
          createdAt: "2026-07-23T10:10:00.000Z",
          type: "付款",
          content: `${demoOrders[0].orderNumber} · ${demoOrders[0].course}`,
          status: demoOrders[0].status,
        },
      ]
    : [];

  if (context) {
    const now = new Date().toISOString();
    const [
      { count: memberCount },
      { data: pendingOrders },
      { data: refundRows },
      { data: pendingRebates },
      { data: inquiryRows },
      { data: sessionRows },
    ] = await Promise.all([
      context.admin
        .from("profiles")
        .select("id", { count: "exact", head: true }),
      context.admin
        .from("orders")
        .select("id, order_number, amount_cents, status, created_at")
        .in("status", ["pending_payment", "payment_review"])
        .order("created_at"),
      context.admin
        .from("refund_requests")
        .select("id, order_id, reason, requested_at")
        .eq("status", "requested")
        .order("requested_at"),
      context.admin
        .from("rebate_records")
        .select("id, amount_cents")
        .in("status", ["pending", "reversal_due"]),
      context.admin
        .from("inquiries")
        .select("id, name, message, status, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
      context.admin
        .from("public_course_sessions")
        .select("id, title, capacity, seats_remaining, starts_at")
        .gte("ends_at", now)
        .order("starts_at")
        .limit(6),
    ]);

    metrics = {
      members: memberCount ?? 0,
      pendingPayments: pendingOrders?.length ?? 0,
      pendingRefunds: refundRows?.length ?? 0,
      pendingRebatesAmount:
        (pendingRebates ?? []).reduce(
          (total, item) => total + item.amount_cents,
          0,
        ) / 100,
    };

    queue = [
      ...(pendingOrders ?? []).map((order) => ({
        id: order.id,
        kind: "payment" as const,
        title: `待確認收款 · ${order.order_number}`,
        detail: `${order.status === "payment_review" ? "付款證明待核對" : "等待付款"} · ${formatHkd(order.amount_cents / 100)}`,
        href: "/admin/orders",
      })),
      ...(refundRows ?? []).map((refund) => ({
        id: refund.id,
        kind: "refund" as const,
        title: "退款申請待審批",
        detail: refund.reason,
        href: "/admin/orders",
      })),
      ...(inquiryRows ?? [])
        .filter((inquiry) => inquiry.status === "new")
        .map((inquiry) => ({
          id: inquiry.id,
          kind: "inquiry" as const,
          title: `新查詢 · ${inquiry.name}`,
          detail: inquiry.message || "未有附加留言",
          href: "/admin/inquiries",
        })),
    ].slice(0, 6);

    capacities = (sessionRows ?? []).map((session) => ({
      id: session.id,
      title: session.title,
      enrolled: Math.max(session.capacity - session.seats_remaining, 0),
      capacity: session.capacity,
    }));

    recent = [
      ...(pendingOrders ?? []).map((order) => ({
        id: order.id,
        createdAt: order.created_at,
        type: "訂單",
        content: `${order.order_number} · ${formatHkd(order.amount_cents / 100)}`,
        status: order.status as OrderStatus,
      })),
      ...(inquiryRows ?? []).map((inquiry) => ({
        id: inquiry.id,
        createdAt: inquiry.created_at,
        type: "查詢",
        content: inquiry.name,
        status: inquiry.status as InquiryStatus,
      })),
    ]
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      )
      .slice(0, 8);
  }

  return (
    <PortalShell variant="admin" activeHref="/admin" userName="LegendX Admin">
      <main className="portal-main">
        <div className="portal-heading">
          <div>
            <p className="eyebrow">Operations dashboard</p>
            <h1>營運總覽</h1>
            <p>今日需要處理嘅收款、退款、獎學金同查詢。</p>
          </div>
          <div className="portal-actions">
            {demo && (
              <DemoActionButton label="重置示範資料" doneLabel="已重置" />
            )}
            <Link className="button button-dark" href="/admin/sessions">
              開新場次
              <ArrowRight size={15} aria-hidden />
            </Link>
          </div>
        </div>

        <section className="portal-grid portal-grid-4">
          <article className="metric-card">
            <small>會員總數</small>
            <span className="metric-value">{metrics.members}</span>
            <span className="metric-note">
              <Users size={13} aria-hidden />
              {demo ? "本月新增 18" : "已建立會員帳戶"}
            </span>
          </article>
          <article className="metric-card">
            <small>待確認收款</small>
            <span className="metric-value">{metrics.pendingPayments}</span>
            <span className="metric-note is-warning">
              <Clock3 size={13} aria-hidden />
              {metrics.pendingPayments} 筆待處理
            </span>
          </article>
          <article className="metric-card">
            <small>待審批退款</small>
            <span className="metric-value">{metrics.pendingRefunds}</span>
            <span className="metric-note is-warning">
              <ReceiptText size={13} aria-hidden />
              {metrics.pendingRefunds} 筆待處理
            </span>
          </article>
          <article className="metric-card">
            <small>待結算／抵扣獎學金</small>
            <span className="metric-value">
              {formatHkd(metrics.pendingRebatesAmount)}
            </span>
            <span className="metric-note is-warning">
              <CircleDollarSign size={13} aria-hidden />
              等待營運覆核
            </span>
          </article>
        </section>

        <div className="dashboard-row">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>需要處理</h2>
                <p>按優先次序顯示嘅營運佇列</p>
              </div>
              <Link className="panel-link" href="/admin/orders">
                全部工作
              </Link>
            </div>
            {queue.length > 0 ? (
              queue.map((item) => (
                <div className="list-row" key={`${item.kind}-${item.id}`}>
                  <div className="list-row-main">
                    <span className="list-icon">
                      {item.kind === "payment" ? (
                        <ReceiptText size={18} aria-hidden />
                      ) : item.kind === "refund" ? (
                        <RotateCcw size={18} aria-hidden />
                      ) : (
                        <UserRoundPlus size={18} aria-hidden />
                      )}
                    </span>
                    <span className="list-copy">
                      <strong>{item.title}</strong>
                      <small>{item.detail}</small>
                    </span>
                  </div>
                  <Link className="table-action" href={item.href}>
                    處理
                  </Link>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <ReceiptText size={22} aria-hidden />
                <h3>目前冇待處理項目</h3>
                <p>新付款、退款或查詢出現時會顯示喺呢度。</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>場次容量</h2>
                <p>有效預留及已付款／總名額</p>
              </div>
            </div>
            {capacities.length > 0 ? (
              <div className="capacity-list">
                {capacities.map((session) => {
                  const percent = Math.min(
                    Math.round((session.enrolled / session.capacity) * 100),
                    100,
                  );
                  return (
                    <div key={session.id}>
                      <span>
                        <strong>{session.title}</strong>
                        <small>
                          {session.enrolled}/{session.capacity}
                        </small>
                      </span>
                      <div>
                        <i style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <CalendarDays size={22} aria-hidden />
                <h3>未有公開場次</h3>
                <p>建立並發佈場次後，容量會喺呢度更新。</p>
              </div>
            )}
          </section>
        </div>

        <section className="panel" style={{ marginTop: "1rem" }}>
          <div className="panel-header">
            <div>
              <h2>最近活動</h2>
              <p>訂單同查詢更新</p>
            </div>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>時間</th>
                  <th>類型</th>
                  <th>內容</th>
                  <th>狀態</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((activity) => (
                  <tr key={`${activity.type}-${activity.id}`}>
                    <td>{formatActivityTime(activity.createdAt)}</td>
                    <td>{activity.type}</td>
                    <td>{activity.content}</td>
                    <td>
                      <StatusBadge status={activity.status} />
                    </td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={4}>暫時未有活動。</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </PortalShell>
  );
}
