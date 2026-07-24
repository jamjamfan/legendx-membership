import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  QrCode,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentMember } from "@/lib/data/current-member";
import { demoInquiries, demoOrders, demoRebates } from "@/lib/demo-data";
import { formatHkd } from "@/lib/domain/catalog";
import type { OrderStatus, RebateStatus } from "@/lib/domain/models";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/runtime";
import { wholeDaysUntil } from "@/lib/time";

export default async function MemberDashboardPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login?next=/member");

  const demo = isDemoMode() && !member.live;
  let orders = demo ? demoOrders.map((order) => ({ ...order })) : [];
  let rebates = demo ? demoRebates.map((rebate) => ({ ...rebate })) : [];
  let inquiryCount = demo ? demoInquiries.length : 0;
  let remainingSlots = demo ? 1 : 0;
  let totalSlots = demo ? 3 : 0;
  let nextLessonLabel = demo ? "8 月 23 日 · 10:00" : "暫未安排";
  let nextLessonDays = demo ? 30 : 0;
  const admin = createSupabaseAdminClient();

  if (member.live && admin) {
    const [
      { data: liveOrders },
      { data: liveRebates },
      { data: batches },
      { count: liveInquiryCount },
      { data: enrollment },
    ] = await Promise.all([
      admin
        .from("orders")
        .select(
          "id, order_number, amount_cents, status, created_at, courses(title)",
        )
        .eq("member_id", member.id)
        .order("created_at", { ascending: false })
        .limit(3),
      admin
        .from("rebate_records")
        .select("id, slot_index, amount_cents, status, created_at")
        .eq("referrer_id", member.id)
        .order("created_at", { ascending: false })
        .limit(5),
      admin
        .from("referral_batches")
        .select("id, slots_total")
        .eq("member_id", member.id)
        .gt("expires_at", new Date().toISOString()),
      admin
        .from("inquiries")
        .select("id", { count: "exact", head: true })
        .eq("referrer_id", member.id),
      admin
        .from("enrollments")
        .select("session_id")
        .eq("member_id", member.id)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    orders = (liveOrders ?? []).map((order) => {
      const course = Array.isArray(order.courses)
        ? order.courses[0]
        : order.courses;
      return {
        id: order.id,
        orderNumber: order.order_number,
        stage: 1,
        course: course?.title ?? "LegendX 課程",
        session: "",
        amount: order.amount_cents / 100,
        method: "",
        status: order.status as OrderStatus,
        createdAt: order.created_at,
      };
    });
    rebates = (liveRebates ?? []).map((rebate) => ({
      id: rebate.id,
      friend: "已付費朋友",
      slotIndex: rebate.slot_index,
      amount: rebate.amount_cents / 100,
      status: rebate.status as RebateStatus,
      createdAt: rebate.created_at,
    }));
    inquiryCount = liveInquiryCount ?? 0;
    totalSlots = (batches ?? []).reduce(
      (sum, batch) => sum + batch.slots_total,
      0,
    );
    remainingSlots = Math.max(
      totalSlots -
        (liveRebates ?? []).filter((rebate) => rebate.status !== "voided").length,
      0,
    );

    if (enrollment) {
      const { data: lesson } = await admin
        .from("session_lessons")
        .select("starts_at")
        .eq("session_id", enrollment.session_id)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(1)
        .maybeSingle();
      if (lesson) {
        const startsAt = new Date(lesson.starts_at);
        nextLessonDays = wholeDaysUntil(startsAt);
        nextLessonLabel = new Intl.DateTimeFormat("zh-HK", {
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Asia/Hong_Kong",
        }).format(startsAt);
      }
    }
  }

  const pendingRebates = rebates
    .filter((rebate) => rebate.status === "pending")
    .reduce((sum, rebate) => sum + rebate.amount, 0);
  const nextStage = Math.min(member.highestCompletedStage + 1, 3);
  const pathHeadline =
    member.highestCompletedStage >= 2
      ? "第二階段已完成，傳承階段等緊你。"
      : member.highestCompletedStage === 1
        ? "財商藍圖完成，下一步將方法落到實踐。"
        : "由財技班開始，建立一套屬於你嘅時間自由系統。";

  return (
    <PortalShell
      variant="member"
      activeHref="/member"
      userName={member.displayName}
    >
      <main className="portal-main">
        <div className="portal-heading">
          <div>
            <p className="eyebrow">Member dashboard</p>
            <h1>你好，{member.displayName}。</h1>
            <p>下一堂、訂單同獎學金進度，全部已經幫你排好。</p>
          </div>
          <div className="portal-actions">
            <Link className="button button-outline" href="/member/pass">
              <QrCode size={16} aria-hidden />
              開啟通行證
            </Link>
            <Link className="button button-dark" href="/member/referral">
              分享介紹連結
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </div>

        <section className="progress-card">
          <div className="progress-card-inner">
            <p className="eyebrow">Your LegendX path</p>
            <h2>{pathHeadline}</h2>
            <p>
              你已經建立方法同實踐成果。報讀第三階段，可以整合個人路線，並再獲得兩個獎學金名額。
            </p>
            <Link className="button button-primary" href={`/course/${nextStage}`}>
              了解下一階段
            </Link>
          </div>
          <div className="progress-steps" aria-label="課程進度">
            {[1, 2, 3].map((stage, index) => (
              <span key={stage} style={{ display: "contents" }}>
                <span
                  className={`progress-step ${
                    stage <= member.highestCompletedStage
                      ? "is-done"
                      : stage === nextStage
                        ? "is-current"
                        : ""
                  }`}
                >
                  {String(stage).padStart(2, "0")}
                </span>
                {index < 2 && <span className="progress-connector" />}
              </span>
            ))}
          </div>
        </section>

        <section className="portal-grid portal-grid-4" style={{ marginTop: "1rem" }}>
          <article className="metric-card">
            <small>下一堂</small>
            <span className="metric-value">{nextLessonDays} 日</span>
            <span className="metric-note">
              <Clock3 size={13} aria-hidden />
              {nextLessonLabel}
            </span>
          </article>
          <article className="metric-card">
            <small>獎學金名額</small>
            <span className="metric-value">{remainingSlots} / {totalSlots}</span>
            <span className="metric-note">目前仍然有效嘅獎學金名額</span>
          </article>
          <article className="metric-card">
            <small>待結算獎學金</small>
            <span className="metric-value">{formatHkd(pendingRebates)}</span>
            <span className="metric-note is-warning">
              <CircleDollarSign size={13} aria-hidden />
              1 筆等待職員結算
            </span>
          </article>
          <article className="metric-card">
            <small>推廣頁查詢</small>
            <span className="metric-value">{inquiryCount}</span>
            <span className="metric-note">
              <Users size={13} aria-hidden />
              1 個新查詢
            </span>
          </article>
        </section>

        <div className="dashboard-row">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>最近訂單</h2>
                <p>付款及退款進度</p>
              </div>
              <Link className="panel-link" href="/member/orders">
                全部訂單
              </Link>
            </div>
            {orders.map((order) => (
              <div className="list-row" key={order.id}>
                <div className="list-row-main">
                  <span className="list-icon">
                    <CalendarDays size={18} aria-hidden />
                  </span>
                  <span className="list-copy">
                    <strong>{order.course}</strong>
                    <small>
                      {order.orderNumber} · {formatHkd(order.amount)}
                    </small>
                  </span>
                </div>
                <StatusBadge status={order.status} />
              </div>
            ))}
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>獎學金進度</h2>
                <p>第二階段 · 180 日有效</p>
              </div>
              <Link className="panel-link" href="/member/referral">
                詳細
              </Link>
            </div>
            <div className="panel-stack">
              {rebates.map((rebate) => (
                <div className="list-row" key={rebate.id}>
                  <span className="list-copy">
                    <strong>
                      第 {rebate.slotIndex} 位 · {rebate.friend}
                    </strong>
                    <small>{formatHkd(rebate.amount)}</small>
                  </span>
                  <StatusBadge status={rebate.status} />
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </PortalShell>
  );
}
