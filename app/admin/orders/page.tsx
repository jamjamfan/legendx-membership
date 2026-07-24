import {
  approveRefund,
  markOrderPaid,
  rejectRefund,
} from "@/app/admin/actions";
import { DemoActionButton } from "@/components/demo-action-button";
import { PortalShell } from "@/components/portal-shell";
import { StatusBadge } from "@/components/status-badge";
import { demoOrders } from "@/lib/demo-data";
import { formatHkd } from "@/lib/domain/catalog";
import { getStaffContext } from "@/lib/auth/staff";
import { isDemoMode } from "@/lib/runtime";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const query = await searchParams;
  const context = await getStaffContext();
  const demo = isDemoMode() && !context;
  const pendingOrders: Array<{
    id: string;
    orderNumber: string;
    member: string;
    course: string;
    method: string;
    amount: number;
    status: "pending_payment" | "payment_review";
  }> = [];
  const refunds: Array<{
    id: string;
    orderNumber: string;
    member: string;
    reason: string;
    amount: number;
  }> = [];

  if (context) {
    const [{ data: liveOrders }, { data: refundRows }] = await Promise.all([
      context.admin
        .from("orders")
        .select(
          "id, order_number, member_id, amount_cents, payment_method, status, courses(title)",
        )
        .in("status", ["pending_payment", "payment_review"])
        .order("created_at"),
      context.admin
        .from("refund_requests")
        .select("id, order_id, reason")
        .in("status", ["requested", "approved"])
        .order("requested_at"),
    ]);
    const orderIds = (refundRows ?? []).map((refund) => refund.order_id);
    const { data: refundOrders } =
      orderIds.length > 0
        ? await context.admin
            .from("orders")
            .select("id, order_number, member_id, amount_cents")
            .in("id", orderIds)
        : { data: [] };
    const memberIds = [
      ...new Set([
        ...(liveOrders ?? []).map((order) => order.member_id),
        ...(refundOrders ?? []).map((order) => order.member_id),
      ]),
    ];
    const { data: profiles } =
      memberIds.length > 0
        ? await context.admin
            .from("profiles")
            .select("id, display_name")
            .in("id", memberIds)
        : { data: [] };
    const memberNames = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile.display_name]),
    );

    for (const order of liveOrders ?? []) {
      const course = Array.isArray(order.courses)
        ? order.courses[0]
        : order.courses;
      pendingOrders.push({
        id: order.id,
        orderNumber: order.order_number,
        member: memberNames.get(order.member_id) ?? "LegendX 會員",
        course: course?.title ?? "LegendX 課程",
        method: order.payment_method.toUpperCase(),
        amount: order.amount_cents / 100,
        status: order.status as "pending_payment" | "payment_review",
      });
    }
    const ordersById = new Map(
      (refundOrders ?? []).map((order) => [order.id, order]),
    );
    for (const refund of refundRows ?? []) {
      const order = ordersById.get(refund.order_id);
      if (!order) continue;
      refunds.push({
        id: refund.id,
        orderNumber: order.order_number,
        member: memberNames.get(order.member_id) ?? "LegendX 會員",
        reason: refund.reason,
        amount: order.amount_cents / 100,
      });
    }
  }

  return (
    <PortalShell
      variant="admin"
      activeHref="/admin/orders"
      userName="LegendX Admin"
    >
      <main className="portal-main">
        <div className="portal-heading">
          <div>
            <p className="eyebrow">Orders & refunds</p>
            <h1>訂單與退款</h1>
            <p>Stripe、FPS、人工收款同退款審批。</p>
          </div>
        </div>
        {query.error && <div className="form-alert is-error">{query.error}</div>}
        {query.success && (
          <div className="form-alert is-success">{query.success}</div>
        )}
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>待處理</h2>
              <p>完成動作會寫入正式版審計記錄</p>
            </div>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>訂單</th>
                  <th>會員／課程</th>
                  <th>付款</th>
                  <th>金額</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {context &&
                  pendingOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong>{order.orderNumber}</strong>
                      </td>
                      <td>
                        <strong>{order.member}</strong>
                        <small>{order.course}</small>
                      </td>
                      <td>{order.method}</td>
                      <td>{formatHkd(order.amount)}</td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                      <td>
                        {order.method !== "STRIPE" ? (
                          <form action={markOrderPaid}>
                            <input name="orderId" type="hidden" value={order.id} />
                            <button className="table-action" type="submit">
                              確認收款
                            </button>
                          </form>
                        ) : (
                          <small>等待 webhook</small>
                        )}
                      </td>
                    </tr>
                  ))}
                {context &&
                  refunds.map((refund) => (
                    <tr key={refund.id}>
                      <td>
                        <strong>{refund.orderNumber}</strong>
                      </td>
                      <td>
                        <strong>{refund.member}</strong>
                        <small>{refund.reason}</small>
                      </td>
                      <td>退款</td>
                      <td>{formatHkd(refund.amount)}</td>
                      <td>
                        <StatusBadge status="refund_requested" />
                      </td>
                      <td className="action-cell">
                        <form action={approveRefund}>
                          <input name="refundId" type="hidden" value={refund.id} />
                          <button className="table-action" type="submit">
                            批准
                          </button>
                        </form>
                        <details className="inline-action-details">
                          <summary className="table-action">拒絕</summary>
                          <form action={rejectRefund} className="inline-action-form">
                            <input name="refundId" type="hidden" value={refund.id} />
                            <textarea
                              name="response"
                              placeholder="拒絕原因"
                              required
                            />
                            <button className="button button-dark" type="submit">
                              確認拒絕
                            </button>
                          </form>
                        </details>
                      </td>
                    </tr>
                  ))}
                {demo && (
                  <>
                    <tr>
                      <td><strong>LX-202607-1028</strong><small>今日 09:24</small></td>
                      <td><strong>黃志文</strong><small>第一階段 · 8 月班</small></td>
                      <td>FPS</td>
                      <td>{formatHkd(880)}</td>
                      <td><StatusBadge status="payment_review" /></td>
                      <td><DemoActionButton label="確認收款" doneLabel="已確認" /></td>
                    </tr>
                    {demoOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.orderNumber}</strong>
                      <small>{order.createdAt}</small>
                    </td>
                    <td>
                      <strong>{order.course}</strong>
                      <small>{order.session}</small>
                    </td>
                    <td>{order.method}</td>
                    <td>{formatHkd(order.amount)}</td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td>
                      <button className="table-action" type="button">
                        詳情
                      </button>
                    </td>
                  </tr>
                    ))}
                  </>
                )}
                {!demo && pendingOrders.length === 0 && refunds.length === 0 && (
                  <tr>
                    <td colSpan={6}>暫時冇待處理訂單或退款。</td>
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
