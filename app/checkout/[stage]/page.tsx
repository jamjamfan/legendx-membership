import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  CircleCheck,
  CreditCard,
  Landmark,
  LockKeyhole,
} from "lucide-react";
import { createCheckoutOrder } from "@/app/checkout/actions";
import { SubmitButton } from "@/components/submit-button";
import { getCurrentStageRegistration } from "@/lib/data/current-stage-registration";
import {
  getPublicSessions,
  hasValidReferralCode,
} from "@/lib/data/public-sessions";
import {
  courses,
  formatHkd,
  type CourseStage,
} from "@/lib/domain/catalog";
import { getCheckoutQuote } from "@/lib/domain/rules";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ stage: string }>;
  searchParams: Promise<{ ref?: string; session?: string; error?: string }>;
}) {
  const { stage: stageParam } = await params;
  const query = await searchParams;
  const stage = Number(stageParam) as CourseStage;
  const course = courses.find((item) => item.stage === stage);
  if (!course) notFound();

  const registration = await getCurrentStageRegistration(stage);
  if (registration) {
    redirect(`/order/${registration.id}?already=1`);
  }

  const [sessions, validReferral] = await Promise.all([
    getPublicSessions(stage),
    hasValidReferralCode(query.ref),
  ]);
  const lockedReferralCode =
    validReferral && query.ref ? query.ref.trim().toUpperCase() : undefined;
  const createOrderWithReferral = createCheckoutOrder.bind(
    null,
    lockedReferralCode,
  );
  const quote = getCheckoutQuote(stage, validReferral);
  const requestedSession = sessions.find(
    (session) =>
      session.id === query.session && session.seatsRemaining > 0,
  );
  const availableSession =
    requestedSession ??
    sessions.find((session) => session.seatsRemaining > 0);

  return (
    <main className="checkout-page">
      <header className="checkout-topbar">
        <Link href={`/course/${stage}`}>
          <ArrowLeft size={15} aria-hidden />
          返回課程
        </Link>
        <span>安全報名</span>
      </header>

      <div className="checkout-shell">
        <section className="checkout-form">
          <p className="eyebrow">Checkout · Stage {stage}</p>
          <h1>確認場次及付款方式</h1>
          <p className="checkout-intro">
            系統會先保留座位；Stripe 30 分鐘，FPS／人工收款 24 小時。
          </p>

          {query.error && <div className="form-alert is-error">{query.error}</div>}

          <form action={createOrderWithReferral} className="form-stack">
            <input name="stage" type="hidden" value={stage} />
            <fieldset className="choice-fieldset">
              <legend>1. 選擇場次</legend>
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <label className="choice-card" key={session.id}>
                    <input
                      defaultChecked={session.id === availableSession?.id}
                      disabled={session.seatsRemaining === 0}
                      name="sessionId"
                      type="radio"
                      value={session.id}
                    />
                    <span>
                      <strong>{session.title}</strong>
                      <small>
                        {session.dateLabel} · {session.timeLabel} · {session.area}
                      </small>
                    </span>
                    <em>
                      {session.seatsRemaining > 0
                        ? `尚餘 ${session.seatsRemaining} 位`
                        : "已滿"}
                    </em>
                  </label>
                ))
              ) : (
                <p className="checkout-empty">暫時未有可報名場次。</p>
              )}
            </fieldset>

            <fieldset className="choice-fieldset">
              <legend>2. 選擇付款方式</legend>
              <label className="choice-card">
                <input defaultChecked name="paymentMethod" type="radio" value="stripe" />
                <CreditCard size={20} aria-hidden />
                <span>
                  <strong>信用卡／Apple Pay／Google Pay</strong>
                  <small>由 Stripe 安全處理，即時確認付款</small>
                </span>
              </label>
              <label className="choice-card">
                <input name="paymentMethod" type="radio" value="fps" />
                <Landmark size={20} aria-hidden />
                <span>
                  <strong>FPS 轉數快</strong>
                  <small>轉賬後上載付款證明，由職員核數</small>
                </span>
              </label>
              <label className="choice-card">
                <input name="paymentMethod" type="radio" value="cash" />
                <Banknote size={20} aria-hidden />
                <span>
                  <strong>人工收款</strong>
                  <small>現金／親身交收，由職員確認</small>
                </span>
              </label>
            </fieldset>

            <label>
              <span>介紹碼（只影響第一階段價格）</span>
              <input
                defaultValue={lockedReferralCode ?? query.ref ?? ""}
                name="referralCode"
                placeholder="例如 GOLD8888"
                readOnly={Boolean(lockedReferralCode)}
              />
              {lockedReferralCode && (
                <small className="locked-field-note">
                  <LockKeyhole size={13} aria-hidden />
                  由朋友專屬連結帶入，介紹碼已鎖定
                </small>
              )}
            </label>

            <SubmitButton
              disabled={!availableSession}
              pendingLabel="正在建立訂單，請稍候…"
            >
              {availableSession
                ? "建立訂單並繼續付款"
                : "暫時未有可報名場次"}
            </SubmitButton>
            <p className="checkout-security">
              <LockKeyhole size={14} aria-hidden />
              正式信用卡資料不會經過 LegendX 伺服器。
            </p>
          </form>
        </section>

        <aside className="order-summary">
          <span className="stage-number">
            STAGE {String(stage).padStart(2, "0")}
          </span>
          <h2>{course.title}</h2>
          <p>{course.summary}</p>
          <div className="summary-lines">
            <span>
              課程費用 <strong>{formatHkd(quote.coursePriceCents / 100)}</strong>
            </span>
            {quote.membershipFeeCents > 0 && (
              <span>
                一次性會員費
                <strong>{formatHkd(quote.membershipFeeCents / 100)}</strong>
              </span>
            )}
            {quote.referralApplied && (
              <span className="summary-discount">
                <CircleCheck size={14} aria-hidden />
                已套用介紹價
              </span>
            )}
          </div>
          <div className="summary-total">
            <span>總額</span>
            <strong>{formatHkd(quote.totalCents / 100)}</strong>
          </div>
          <small>所有金額以港幣計算。退款須由會員中心提交申請。</small>
        </aside>
      </div>
    </main>
  );
}
