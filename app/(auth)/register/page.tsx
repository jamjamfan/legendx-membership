import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, LockKeyhole } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { SubmitButton } from "@/components/submit-button";
import { signUp } from "@/app/(auth)/actions";
import { getCurrentMember } from "@/lib/data/current-member";
import { getCurrentStageRegistration } from "@/lib/data/current-stage-registration";
import { hasValidReferralCode } from "@/lib/data/public-sessions";
import type { CourseStage } from "@/lib/domain/catalog";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    ref?: string;
    stage?: string;
  }>;
}) {
  const query = await searchParams;
  const stage = ["1", "2", "3"].includes(query.stage ?? "")
    ? query.stage
    : "1";
  const stageNumber = Number(stage) as CourseStage;
  const [member, registration, validReferral] = await Promise.all([
    getCurrentMember(),
    getCurrentStageRegistration(stageNumber),
    hasValidReferralCode(query.ref),
  ]);
  const lockedReferralCode =
    validReferral && query.ref ? query.ref.trim().toUpperCase() : undefined;
  const signUpWithReferral = signUp.bind(null, lockedReferralCode);

  if (registration) {
    redirect(`/order/${registration.id}?already=1`);
  }
  if (member) {
    const checkoutPath = `/checkout/${stage}${
      lockedReferralCode
        ? `?ref=${encodeURIComponent(lockedReferralCode)}`
        : ""
    }`;
    redirect(checkoutPath);
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <Link href="/">
          <BrandMark />
        </Link>
        <div>
          <p className="eyebrow">Begin your path</p>
          <h1>從一個清晰的起點開始。</h1>
          <ul className="auth-benefits">
            <li>
              <Check size={16} aria-hidden />
              報名及付款進度
            </li>
            <li>
              <Check size={16} aria-hidden />
              課堂提醒、行事曆及 QR 通行證
            </li>
            <li>
              <Check size={16} aria-hidden />
              個人介紹頁及獎學金記錄
            </li>
          </ul>
        </div>
        <span className="auth-trust">
          課堂時間、場地及變更通知會協助你掌握最新安排。
        </span>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap auth-form-wide">
          <Link className="auth-back" href="/">
            <ArrowLeft size={15} aria-hidden />
            返回首頁
          </Link>
          <p className="eyebrow">Create account</p>
          <h2>建立 LegendX 帳戶</h2>
          <p className="auth-intro">完成後將前往第 {stage} 階段報名。</p>

          {query.error && <div className="form-alert is-error">{query.error}</div>}

          <form action={signUpWithReferral} className="form-stack">
            <input name="stage" type="hidden" value={stage} />
            <div className="form-grid">
              <label>
                <span>姓名</span>
                <input
                  autoComplete="name"
                  name="displayName"
                  placeholder="陳大文"
                  required
                />
              </label>
              <label>
                <span>電話</span>
                <input
                  autoComplete="tel"
                  name="phone"
                  placeholder="9123 4567"
                  required
                  type="tel"
                />
              </label>
            </div>
            <label>
              <span>電郵</span>
              <input
                autoComplete="email"
                name="email"
                placeholder="name@example.com"
                required
                type="email"
              />
            </label>
            <label>
              <span>密碼</span>
              <input
                autoComplete="new-password"
                minLength={10}
                name="password"
                placeholder="最少 10 個字元"
                required
                type="password"
              />
            </label>
            <label>
              <span>介紹碼（選填）</span>
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
            <fieldset className="consent-fields">
              <legend>提醒及通知上課時間及更改時間</legend>
              <label>
                <input
                  defaultChecked
                  name="marketingEmailConsent"
                  type="checkbox"
                />
                <span>我願意經電郵接收 LegendX 上課時間及課程資訊</span>
              </label>
              <label>
                <input
                  defaultChecked
                  name="marketingWhatsappConsent"
                  type="checkbox"
                />
                <span>我願意經 WhatsApp 接收 LegendX 上課時間及課程資訊</span>
              </label>
            </fieldset>
            <p className="form-legal">
              建立帳戶即代表你同意 <Link href="/terms">服務條款</Link> 及確認已閱讀{" "}
              <Link href="/privacy">收集個人資料聲明</Link>。
            </p>
            <SubmitButton pendingLabel="正在建立帳戶，請勿重複提交…">
              建立帳戶並繼續
            </SubmitButton>
          </form>
        </div>
      </section>
    </main>
  );
}
