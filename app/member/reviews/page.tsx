import { Star } from "lucide-react";
import { redirect } from "next/navigation";
import { submitReview } from "@/app/member/actions";
import { PortalShell } from "@/components/portal-shell";
import { getCurrentMember } from "@/lib/data/current-member";
import { isDemoMode } from "@/lib/runtime";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function MemberReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const query = await searchParams;
  const member = await getCurrentMember();
  if (!member) redirect("/login?next=/member/reviews");
  const admin = createSupabaseAdminClient();
  let sessions =
    isDemoMode() && !member.live
      ? [{ id: "demo-session", title: "第一階段 · 7 月班" }]
      : [];

  if (member.live && admin) {
    const { data: enrollments } = await admin
      .from("enrollments")
      .select("session_id")
      .eq("member_id", member.id)
      .eq("status", "completed");
    const ids = (enrollments ?? []).map((item) => item.session_id);
    const { data } =
      ids.length > 0
        ? await admin
            .from("course_sessions")
            .select("id, title")
            .in("id", ids)
            .order("starts_at", { ascending: false })
        : { data: [] };
    sessions = data ?? [];
  }

  return (
    <PortalShell
      variant="member"
      activeHref="/member/reviews"
      userName={member.displayName}
    >
      <main className="portal-main">
        <div className="portal-heading">
          <div>
            <p className="eyebrow">Course feedback</p>
            <h1>課後評價</h1>
            <p>你嘅回饋會幫我哋改善課程；公開展示必須由你明確同意。</p>
          </div>
        </div>
        {query.error && <div className="form-alert is-error">{query.error}</div>}
        {query.success && (
          <div className="form-alert is-success">
            評價已收到，職員審核後先會公開。
          </div>
        )}
        <section className="panel review-form-panel">
          {sessions.length > 0 ? (
            <form action={submitReview} className="form-stack">
              <label>
                <span>課程場次</span>
                <select name="sessionId" required>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.title}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="rating-fieldset">
                <legend>整體評分</legend>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <label key={rating}>
                    <input name="rating" required type="radio" value={rating} />
                    <span>
                      {Array.from({ length: rating }).map((_, index) => (
                        <Star fill="currentColor" key={index} size={15} aria-hidden />
                      ))}
                    </span>
                  </label>
                ))}
              </fieldset>
              <label>
                <span>評語</span>
                <textarea name="comment" required />
              </label>
              <label className="inline-check">
                <input name="consentPublic" type="checkbox" />
                <span>
                  我同意 LegendX 喺推廣頁展示呢段評價同我嘅顯示名稱
                </span>
              </label>
              <button className="button button-dark" type="submit">
                提交評價
              </button>
            </form>
          ) : (
            <div className="empty-state">
              <Star size={24} aria-hidden />
              <h2>完成課程後就可以評價</h2>
              <p>你目前未有已完成而可以評價嘅場次。</p>
            </div>
          )}
        </section>
      </main>
    </PortalShell>
  );
}
