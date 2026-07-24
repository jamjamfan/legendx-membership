import Link from "next/link";
import { ArrowLeft, BellRing, CircleCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { joinWaitlist } from "@/app/waitlist/actions";
import { demoSessions } from "@/lib/demo-data";
import { getPublicSessionById } from "@/lib/data/public-sessions";
import { isDemoMode } from "@/lib/runtime";

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; success?: string; error?: string }>;
}) {
  const query = await searchParams;
  const publicSession = await getPublicSessionById(query.session);
  if (!publicSession && !isDemoMode()) notFound();
  const session = publicSession ?? demoSessions[1];

  return (
    <main className="order-page">
      <section className="order-confirmation waitlist-card">
        <span className="confirmation-icon is-pending">
          <BellRing size={26} aria-hidden />
        </span>
        <p className="eyebrow">Waitlist</p>
        <h1>加入候補名單</h1>
        <p>
          {session.title} 目前已滿。有人退出時，職員會按候補次序發出 24
          小時報名邀請。
        </p>

        {query.success ? (
          <div className="form-alert is-success">
            <CircleCheck size={15} aria-hidden /> 已加入候補，我哋有位會通知你。
          </div>
        ) : (
          <form action={joinWaitlist} className="form-stack">
            <input name="session" type="hidden" value={session.id} />
            <input
              aria-hidden
              autoComplete="off"
              className="hp-field"
              name="website"
              tabIndex={-1}
            />
            {query.error && <div className="form-alert is-error">{query.error}</div>}
            <label>
              <span>姓名</span>
              <input name="name" required />
            </label>
            <label>
              <span>電話</span>
              <input name="phone" required type="tel" />
            </label>
            <label>
              <span>電郵（選填）</span>
              <input name="email" type="email" />
            </label>
            <button className="button button-dark" type="submit">
              確認加入候補
            </button>
          </form>
        )}

        <Link className="auth-back" href="/course/1" style={{ margin: "1.4rem auto 0" }}>
          <ArrowLeft size={14} aria-hidden />
          返回場次列表
        </Link>
      </section>
    </main>
  );
}
