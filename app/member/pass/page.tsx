import {
  CalendarDays,
  Clock3,
  MapPin,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { notFound } from "next/navigation";
import { MemberPassCard } from "@/components/member-pass-card";
import { PortalShell } from "@/components/portal-shell";
import { demoMember } from "@/lib/demo-data";
import { isDemoMode } from "@/lib/runtime";
import { issueCheckInToken } from "@/lib/security/qr-token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MemberPassPage() {
  const server = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  let memberId: string = demoMember.id;
  let memberName: string = demoMember.displayName;
  let sessionId: string = "session-stage-1-finance-3";
  let sessionTitle: string = "財技 3 班 · 三晚時間自由藍圖";
  let dateLabel: string = "2026 年 7 月 24、31 日及 8 月 7 日（星期五）";
  let timeLabel: string = "19:00–22:30";
  let venueLabel: string = "華盛數碼大廈 2303 室 · 觀塘";

  if (server && admin) {
    const {
      data: { user },
    } = await server.auth.getUser();
    if (!user) notFound();

    const [{ data: profile }, { data: enrollment }] = await Promise.all([
      admin
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle(),
      admin
        .from("enrollments")
        .select("session_id")
        .eq("member_id", user.id)
        .in("status", ["confirmed", "completed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (!profile || !enrollment) notFound();

    const { data: session } = await admin
      .from("course_sessions")
      .select("id, title, starts_at, ends_at, area, venue_name")
      .eq("id", enrollment.session_id)
      .maybeSingle();
    if (!session) notFound();

    const startsAt = new Date(session.starts_at);
    const endsAt = new Date(session.ends_at);
    memberId = user.id;
    memberName = profile.display_name;
    sessionId = session.id;
    sessionTitle = session.title;
    dateLabel = new Intl.DateTimeFormat("zh-HK", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
      timeZone: "Asia/Hong_Kong",
    }).format(startsAt);
    const timeFormatter = new Intl.DateTimeFormat("zh-HK", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Hong_Kong",
    });
    timeLabel = `${timeFormatter.format(startsAt)}–${timeFormatter.format(endsAt)}`;
    venueLabel = [session.venue_name, session.area].filter(Boolean).join(" · ");
  } else if (!isDemoMode()) {
    notFound();
  }

  const token = await issueCheckInToken(memberId, sessionId);

  return (
    <PortalShell
      variant="member"
      activeHref="/member/pass"
      userName={memberName}
    >
      <main className="portal-main">
        <div className="portal-heading">
          <div>
            <p className="eyebrow">Class pass</p>
            <h1>課堂通行證</h1>
            <p>到場後出示 QR，職員掃碼即可完成簽到。</p>
          </div>
        </div>
        <div className="portal-grid portal-grid-2 pass-layout">
          <MemberPassCard
            memberName={memberName}
            token={token}
            courseLabel={sessionTitle}
          />
          <section className="panel pass-details">
            <div className="panel-header">
              <div>
                <h2>下一堂資料</h2>
                <p>完整地址只向已付款學員顯示</p>
              </div>
            </div>
            <div className="pass-detail-row">
              <CalendarDays size={18} aria-hidden />
              <span>
                <small>日期</small>
                <strong>{dateLabel}</strong>
              </span>
            </div>
            <div className="pass-detail-row">
              <Clock3 size={18} aria-hidden />
              <span>
                <small>時間</small>
                <strong>{timeLabel}</strong>
              </span>
            </div>
            <div className="pass-detail-row">
              <MapPin size={18} aria-hidden />
              <span>
                <small>地點</small>
                <strong>{venueLabel}</strong>
              </span>
            </div>
            <div className="pass-security">
              <ShieldCheck size={18} aria-hidden />
              <p>
                這張通行證包含短期簽名資料；每次掃碼均會在伺服器驗證會員、場次、課堂及簽到狀態。
              </p>
            </div>
            <div className="action-cell">
              {process.env.GOOGLE_WALLET_ISSUER_ID && (
                <a
                  className="button button-outline"
                  href={`/api/wallet/google?session=${encodeURIComponent(sessionId)}`}
                >
                  <WalletCards size={15} aria-hidden />
                  加到 Google Wallet
                </a>
              )}
              {process.env.APPLE_PASS_TYPE_IDENTIFIER && (
                <a
                  className="button button-dark"
                  href={`/api/wallet/apple?session=${encodeURIComponent(sessionId)}`}
                >
                  <WalletCards size={15} aria-hidden />
                  加到 Apple Wallet
                </a>
              )}
            </div>
          </section>
        </div>
      </main>
    </PortalShell>
  );
}
