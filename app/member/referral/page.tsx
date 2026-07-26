import { ExternalLink, Eye, MessageSquareText, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { PortalShell } from "@/components/portal-shell";
import { ReferralQrCard } from "@/components/referral-qr-card";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentMember } from "@/lib/data/current-member";
import { demoRebates } from "@/lib/demo-data";
import { formatHkd } from "@/lib/domain/catalog";
import type { RebateStatus } from "@/lib/domain/models";
import { isDemoMode } from "@/lib/runtime";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isoDaysAgo } from "@/lib/time";

export default async function MemberReferralPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login?next=/member/referral");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const promoUrl = `${appUrl}/p/${member.referralCode}`;
  const demo = isDemoMode() && !member.live;
  let viewCount = demo ? 42 : 0;
  let inquiryCount = demo ? 2 : 0;
  let paidFriendCount = demo ? 2 : 0;
  let totalSlots = demo ? 3 : 0;
  let usedSlots = demo ? 2 : 0;
  let slotLabel = demo ? "第二階段名額" : "有效獎學金名額";
  let rebates = demo
    ? demoRebates.map((rebate) => ({
        id: rebate.id,
        slotIndex: rebate.slotIndex,
        friend: rebate.friend,
        amount: rebate.amount,
        status: rebate.status,
        createdAt: rebate.createdAt,
      }))
    : [];

  const admin = createSupabaseAdminClient();
  if (member.live && admin) {
    const since = isoDaysAgo(30);
    const [
      { data: batches },
      { data: liveRebates },
      { data: events },
      { count: liveInquiryCount },
    ] = await Promise.all([
      admin
        .from("referral_batches")
        .select("id, programme, slots_total, expires_at")
        .eq("member_id", member.id)
        .gt("expires_at", new Date().toISOString())
        .order("valid_from"),
      admin
        .from("rebate_records")
        .select(
          "id, batch_id, referred_member_id, slot_index, amount_cents, status, created_at",
        )
        .eq("referrer_id", member.id)
        .order("created_at", { ascending: false }),
      admin
        .from("promo_events")
        .select("event_type")
        .eq("referrer_id", member.id)
        .gte("occurred_at", since),
      admin
        .from("inquiries")
        .select("id", { count: "exact", head: true })
        .eq("referrer_id", member.id),
    ]);

    const activeBatchIds = new Set((batches ?? []).map((batch) => batch.id));
    totalSlots = (batches ?? []).reduce(
      (sum, batch) => sum + batch.slots_total,
      0,
    );
    usedSlots = (liveRebates ?? []).filter(
      (rebate) =>
        activeBatchIds.has(rebate.batch_id) && rebate.status !== "voided",
    ).length;
    slotLabel =
      batches?.[0]?.programme === "stage_3"
        ? "第三階段名額"
        : "有效獎學金名額";
    viewCount = events?.filter((event) => event.event_type === "view").length ?? 0;
    paidFriendCount =
      events?.filter((event) => event.event_type === "paid").length ?? 0;
    inquiryCount = liveInquiryCount ?? 0;

    const memberIds = [
      ...new Set((liveRebates ?? []).map((item) => item.referred_member_id)),
    ];
    const { data: referredProfiles } =
      memberIds.length > 0
        ? await admin
            .from("profiles")
            .select("id, display_name")
            .in("id", memberIds)
        : { data: [] };
    const names = new Map(
      (referredProfiles ?? []).map((profile) => [
        profile.id,
        profile.display_name,
      ]),
    );
    rebates = (liveRebates ?? []).map((rebate) => ({
      id: rebate.id,
      slotIndex: rebate.slot_index,
      friend: names.get(rebate.referred_member_id) ?? "LegendX 會員",
      amount: rebate.amount_cents / 100,
      status: rebate.status as RebateStatus,
      createdAt: new Intl.DateTimeFormat("zh-HK", {
        dateStyle: "medium",
        timeZone: "Asia/Hong_Kong",
      }).format(new Date(rebate.created_at)),
    }));
  }

  const remainingSlots = Math.max(totalSlots - usedSlots, 0);
  const conversionRate =
    viewCount > 0 ? ((paidFriendCount / viewCount) * 100).toFixed(1) : "0.0";

  return (
    <PortalShell
      variant="member"
      activeHref="/member/referral"
      userName={member.displayName}
    >
      <main className="portal-main">
        <div className="portal-heading">
          <div>
            <p className="eyebrow">My referrals</p>
            <h1>我嘅介紹</h1>
            <p>分享專屬頁面，追蹤每個名額同獎學金記錄。</p>
          </div>
          <div className="portal-actions">
            <a className="button button-outline" href={promoUrl} target="_blank">
              <ExternalLink size={15} aria-hidden />
              預覽推廣頁
            </a>
            <CopyButton value={promoUrl} />
          </div>
        </div>

        <section className="referral-hero panel">
          <div>
            <span className="stage-number">YOUR REFERRAL CODE</span>
            <strong>{member.referralCode}</strong>
            <p>{promoUrl}</p>
          </div>
          <div className="referral-hero-tools">
            <ReferralQrCard
              code={member.referralCode}
              url={promoUrl}
            />
            <div className="referral-slots">
              {Array.from({ length: totalSlots }).map((_, index) => (
                <span
                  className={`slot-token ${index < usedSlots ? "is-used" : ""}`}
                  key={index}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
              ))}
              <small>{slotLabel} · 尚餘 {remainingSlots} 個</small>
            </div>
          </div>
        </section>

        <section className="portal-grid portal-grid-3" style={{ marginTop: "1rem" }}>
          <article className="metric-card">
            <small>推廣頁瀏覽</small>
            <span className="metric-value">{viewCount}</span>
            <span className="metric-note">
              <Eye size={13} aria-hidden />
              最近 30 日
            </span>
          </article>
          <article className="metric-card">
            <small>查詢</small>
            <span className="metric-value">{inquiryCount}</span>
            <span className="metric-note">
              <MessageSquareText size={13} aria-hidden />
              1 個待聯絡
            </span>
          </article>
          <article className="metric-card">
            <small>已付費朋友</small>
            <span className="metric-value">{paidFriendCount}</span>
            <span className="metric-note">
              <Users size={13} aria-hidden />
              轉化率 {conversionRate}%
            </span>
          </article>
        </section>

        <section className="panel" style={{ marginTop: "1rem" }}>
          <div className="panel-header">
            <div>
              <h2>獎學金記錄</h2>
              <p>每筆回贈及結算狀態</p>
            </div>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>名額</th>
                  <th>朋友</th>
                  <th>金額</th>
                  <th>產生日期</th>
                  <th>狀態</th>
                </tr>
              </thead>
              <tbody>
                {rebates.map((rebate) => (
                  <tr key={rebate.id}>
                    <td>第 {rebate.slotIndex} 個</td>
                    <td>{rebate.friend}</td>
                    <td>{formatHkd(rebate.amount)}</td>
                    <td>{rebate.createdAt}</td>
                    <td>
                      <StatusBadge status={rebate.status} />
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
