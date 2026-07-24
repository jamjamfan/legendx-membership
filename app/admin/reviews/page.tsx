import { Star } from "lucide-react";
import { moderateReview } from "@/app/admin/actions";
import { DemoActionButton } from "@/components/demo-action-button";
import { PortalShell } from "@/components/portal-shell";
import { getStaffContext } from "@/lib/auth/staff";
import { isDemoMode } from "@/lib/runtime";

const reviews = [
  {
    id: "review-1",
    name: "王小敏",
    rating: 5,
    course: "第一階段 · 7 月班",
    comment: "由一開始好多想法，到最後可以整理成清晰行動，導師回饋非常具體。",
    consent: true,
  },
  {
    id: "review-2",
    name: "何俊豪",
    rating: 4,
    course: "第二階段 · 6 月班",
    comment: "實戰練習令我知道自己之前卡喺邊，亦有同學一齊互相提醒。",
    consent: true,
  },
  {
    id: "review-3",
    name: "匿名會員",
    rating: 3,
    course: "第一階段 · 7 月班",
    comment: "內容實用，希望之後可以增加多一點練習時間。",
    consent: false,
  },
] as const;

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const query = await searchParams;
  const context = await getStaffContext();
  const demo = isDemoMode() && !context;
  let rows = demo
    ? reviews.map((review) => ({ ...review, live: false }))
    : [];

  if (context) {
    const { data: liveReviews } = await context.admin
      .from("reviews")
      .select(
        "id, member_id, session_id, rating, comment, consent_public, public_display_name, status",
      )
      .order("created_at", { ascending: false });
    const memberIds = [
      ...new Set((liveReviews ?? []).map((review) => review.member_id)),
    ];
    const sessionIds = [
      ...new Set((liveReviews ?? []).map((review) => review.session_id)),
    ];
    const [{ data: profiles }, { data: sessions }] = await Promise.all([
      memberIds.length
        ? context.admin
            .from("profiles")
            .select("id, display_name")
            .in("id", memberIds)
        : Promise.resolve({ data: [] }),
      sessionIds.length
        ? context.admin
            .from("course_sessions")
            .select("id, title")
            .in("id", sessionIds)
        : Promise.resolve({ data: [] }),
    ]);
    const names = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile.display_name]),
    );
    const titles = new Map(
      (sessions ?? []).map((session) => [session.id, session.title]),
    );
    rows = (liveReviews ?? []).map((review) => ({
      id: review.id,
      name:
        review.public_display_name ??
        names.get(review.member_id) ??
        "匿名會員",
      rating: review.rating,
      course: titles.get(review.session_id) ?? "LegendX 課程",
      comment: review.comment,
      consent: review.consent_public,
      live: true,
    }));
  }

  return (
    <PortalShell
      variant="admin"
      activeHref="/admin/reviews"
      userName="LegendX Admin"
    >
      <main className="portal-main">
        <div className="portal-heading">
          <div>
            <p className="eyebrow">Reviews</p>
            <h1>課後評價</h1>
            <p>只有 4 星以上兼已同意公開嘅評價可以展示。</p>
          </div>
        </div>
        {query.error && <div className="form-alert is-error">{query.error}</div>}
        {query.success && (
          <div className="form-alert is-success">{query.success}</div>
        )}
        <section className="review-admin-list">
          {rows.map((review) => (
            <article className="panel review-admin-card" key={review.id}>
              <div>
                <span className="review-stars" aria-label={`${review.rating} 星`}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      fill={index < review.rating ? "currentColor" : "none"}
                      key={index}
                      size={14}
                      aria-hidden
                    />
                  ))}
                </span>
                <h2>{review.name}</h2>
                <small>{review.course}</small>
              </div>
              <p>{review.comment}</p>
              <div>
                <span
                  className={`status-badge ${review.consent ? "status-positive" : "status-neutral"}`}
                >
                  {review.consent ? "已同意公開" : "只供內部"}
                </span>
                {review.consent && review.rating >= 4 && (
                  review.live ? (
                    <form action={moderateReview}>
                      <input name="reviewId" type="hidden" value={review.id} />
                      <input name="action" type="hidden" value="publish" />
                      <button className="table-action" type="submit">
                        發佈
                      </button>
                    </form>
                  ) : (
                    <DemoActionButton label="發佈" doneLabel="已發佈" />
                  )
                )}
              </div>
            </article>
          ))}
        </section>
      </main>
    </PortalShell>
  );
}
