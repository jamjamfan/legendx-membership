import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarPlus,
  CircleCheck,
  Clock3,
  Landmark,
  ReceiptText,
} from "lucide-react";
import { formatHkd } from "@/lib/domain/catalog";
import { uploadPaymentProof } from "@/app/order/actions";
import { SubmitButton } from "@/components/submit-button";
import { getCurrentMember } from "@/lib/data/current-member";
import { isDemoMode } from "@/lib/runtime";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    method?: string;
    stage?: string;
    error?: string;
    proof?: string;
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  let method = ["stripe", "fps", "cash"].includes(query.method ?? "")
    ? query.method
    : "stripe";
  let pending = method !== "stripe";
  let amount = query.stage === "2" ? 6900 : query.stage === "3" ? 3800 : 880;
  let orderNumber = id;
  let paid = !pending;
  let live = false;
  const member = await getCurrentMember();
  const server = await createSupabaseServerClient();

  if (member?.live && server) {
    const { data: order } = await server
      .from("orders")
      .select("id, order_number, amount_cents, payment_method, status")
      .eq("id", id)
      .eq("member_id", member.id)
      .maybeSingle();
    if (!order) notFound();
    method = order.payment_method;
    amount = order.amount_cents / 100;
    orderNumber = order.order_number;
    paid = order.status === "paid";
    pending = !paid;
    live = true;
  } else if (!member && !isDemoMode()) {
    redirect(`/login?next=/order/${encodeURIComponent(id)}`);
  }

  return (
    <main className="order-page">
      <section className="order-confirmation">
        <span className={`confirmation-icon ${pending ? "is-pending" : ""}`}>
          {pending ? (
            <Clock3 size={28} aria-hidden />
          ) : (
            <CircleCheck size={28} aria-hidden />
          )}
        </span>
        <p className="eyebrow">
          {pending ? "Payment pending" : "Payment confirmed"}
        </p>
        <h1>{pending ? "訂單已建立，等待確認付款。" : "報名完成，歡迎加入 LegendX。"}</h1>
        <p>
          {pending
            ? "完成以下付款步驟後，職員會核對款項並確認你嘅座位。"
            : "課程已經加入會員中心；你會喺上堂前收到提醒。"}
        </p>
        {query.error && <div className="form-alert is-error">{query.error}</div>}
        {query.proof && (
          <div className="form-alert is-success">
            付款證明已收到，職員核數後會確認座位。
          </div>
        )}

        <div className="receipt-card">
          <div className="receipt-head">
            <span>
              <ReceiptText size={16} aria-hidden />
              訂單 {orderNumber}
            </span>
            <strong>{formatHkd(amount)}</strong>
          </div>
          {method === "fps" && (
            <div className="payment-instructions">
              <Landmark size={20} aria-hidden />
              <div>
                <strong>
                  FPS 識別碼：{process.env.FPS_IDENTIFIER ?? "請向職員索取"}
                </strong>
                <p>轉賬備註請填：{orderNumber}</p>
                <small>座位會保留 24 小時；完成後請上載付款證明。</small>
              </div>
            </div>
          )}
          {method === "fps" && pending && live && (
            <form action={uploadPaymentProof} className="proof-upload-form">
              <input name="orderId" type="hidden" value={id} />
              <label>
                <span>付款證明（JPG、PNG 或 PDF；最多 5MB）</span>
                <input
                  accept="image/jpeg,image/png,application/pdf"
                  name="proof"
                  required
                  type="file"
                />
              </label>
              <SubmitButton pendingLabel="正在上載付款證明…">
                上載付款證明
              </SubmitButton>
            </form>
          )}
          {method === "cash" && (
            <div className="payment-instructions">
              <Clock3 size={20} aria-hidden />
              <div>
                <strong>請聯絡 LegendX 安排交收</strong>
                <p>座位會保留 24 小時。</p>
                <small>職員收款後會喺後台確認訂單。</small>
              </div>
            </div>
          )}
          {method === "stripe" && paid && (
            <div className="payment-instructions">
              <CircleCheck size={20} aria-hidden />
              <div>
                <strong>付款已由 Stripe webhook 確認</strong>
                <p>收據同課程資料已經加入會員中心。</p>
              </div>
            </div>
          )}
        </div>

        <div className="order-actions">
          <Link className="button button-dark" href="/member">
            返回會員中心
            <ArrowRight size={16} aria-hidden />
          </Link>
          {!pending && (
            <a className="button button-outline" href={`/api/calendar/${id}`}>
              <CalendarPlus size={16} aria-hidden />
              加入行事曆
            </a>
          )}
        </div>
      </section>
    </main>
  );
}
