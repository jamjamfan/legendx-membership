import Link from "next/link";
import { Download } from "lucide-react";
import { requestRefund } from "@/app/member/actions";
import { PortalShell } from "@/components/portal-shell";
import { StatusBadge } from "@/components/status-badge";
import { demoMember, demoOrders } from "@/lib/demo-data";
import { formatHkd } from "@/lib/domain/catalog";
import type { OrderStatus } from "@/lib/domain/models";
import { memberRefundsEnabled } from "@/lib/features";
import { isDemoMode } from "@/lib/runtime";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface DisplayOrder {
  id: string;
  orderNumber: string;
  stage: number;
  course: string;
  session: string;
  amount: number;
  method: string;
  status: OrderStatus;
  createdAt: string;
  isLive: boolean;
}

export default async function MemberOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const query = await searchParams;
  const server = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const demo = isDemoMode() && (!server || !admin);
  let userName = demo ? demoMember.displayName : "LegendX 會員";
  let orders: DisplayOrder[] = demo
    ? demoOrders.map((order) => ({
        ...order,
        isLive: false,
      }))
    : [];

  if (server && admin) {
    const {
      data: { user },
    } = await server.auth.getUser();
    if (user) {
      const [{ data: profile }, { data: liveOrders }] = await Promise.all([
        admin
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle(),
        admin
          .from("orders")
          .select(
            "id, order_number, amount_cents, payment_method, status, created_at, courses(title), course_sessions(title)",
          )
          .eq("member_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      userName = profile?.display_name ?? userName;
      orders = (liveOrders ?? []).map((order) => {
        const course = Array.isArray(order.courses)
          ? order.courses[0]
          : order.courses;
        const session = Array.isArray(order.course_sessions)
          ? order.course_sessions[0]
          : order.course_sessions;
        return {
          id: order.id,
          orderNumber: order.order_number,
          stage: 1,
          course: course?.title ?? "LegendX 課程",
          session: session?.title ?? "場次",
          amount: order.amount_cents / 100,
          method: order.payment_method.toUpperCase(),
          status: order.status as OrderStatus,
          createdAt: new Intl.DateTimeFormat("zh-HK", {
            dateStyle: "medium",
            timeZone: "Asia/Hong_Kong",
          }).format(new Date(order.created_at)),
          isLive: true,
        };
      });
    }
  }

  return (
    <PortalShell
      variant="member"
      activeHref="/member/orders"
      userName={userName}
    >
      <main className="portal-main">
        <div className="portal-heading">
          <div>
            <p className="eyebrow">My orders</p>
            <h1>訂單記錄</h1>
            <p>付款狀態及正式收據均集中顯示於此。</p>
          </div>
        </div>
        {memberRefundsEnabled && query.error && (
          <div className="form-alert is-error">{query.error}</div>
        )}
        {memberRefundsEnabled && query.success && (
          <div className="form-alert is-success">
            {query.success === "refund_requested"
              ? "退款申請已送出，職員會盡快審批。"
              : "示範模式：退款流程已預覽。"}
          </div>
        )}
        <section className="panel">
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>訂單</th>
                  <th>課程／場次</th>
                  <th>付款方式</th>
                  <th>金額</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
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
                      <div className="action-cell">
                        <Link className="table-action" href={`/order/${order.id}`}>
                          <Download size={13} aria-hidden />
                          查看收據
                        </Link>
                        {memberRefundsEnabled &&
                          order.status === "paid" &&
                          order.isLive && (
                          <details className="inline-action-details">
                            <summary className="table-action">申請退款</summary>
                            <form action={requestRefund} className="inline-action-form">
                              <input name="orderId" type="hidden" value={order.id} />
                              <textarea
                                aria-label="退款原因"
                                name="reason"
                                placeholder="請簡述退款原因"
                                required
                              />
                              <button className="button button-dark" type="submit">
                                送出申請
                              </button>
                            </form>
                          </details>
                          )}
                      </div>
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
