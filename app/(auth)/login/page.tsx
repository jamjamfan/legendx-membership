import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import {
  resendConfirmation,
  signIn,
  signInDemo,
} from "@/app/(auth)/actions";
import { isDemoMode } from "@/lib/runtime";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
    next?: string;
  }>;
}) {
  const query = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <Link href="/">
          <BrandMark />
        </Link>
        <div>
          <p className="eyebrow">Member access</p>
          <h1>返到你嘅 LegendX 路線。</h1>
          <p>
            課程、訂單、通行證同獎學金進度，都會留喺你上次離開嘅位置。
          </p>
        </div>
        <span className="auth-trust">
          <ShieldCheck size={16} aria-hidden />
          正式版使用電郵驗證、加密連線及角色權限保護
        </span>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <Link className="auth-back" href="/">
            <ArrowLeft size={15} aria-hidden />
            返回首頁
          </Link>
          <p className="eyebrow">Sign in</p>
          <h2>會員登入</h2>
          <p className="auth-intro">輸入註冊電郵同密碼，繼續你嘅課程。</p>

          {query.error && <div className="form-alert is-error">{query.error}</div>}
          {query.message && (
            <div className="form-alert is-success">{query.message}</div>
          )}

          <form action={signIn} className="form-stack">
            <input name="next" type="hidden" value={query.next ?? ""} />
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
                autoComplete="current-password"
                minLength={10}
                name="password"
                placeholder="最少 10 個字元"
                required
                type="password"
              />
            </label>
            <button className="button button-dark" type="submit">
              登入會員中心
            </button>
          </form>

          <p className="auth-switch">
            未有帳戶？ <Link href="/register">建立帳戶</Link>
          </p>

          <div className="resend-access">
            <span>驗證連結過期或開唔到？</span>
            <form action={resendConfirmation} className="form-stack">
              <input name="next" type="hidden" value={query.next ?? "/member"} />
              <label>
                <span>註冊電郵</span>
                <input
                  autoComplete="email"
                  name="email"
                  placeholder="name@example.com"
                  required
                  type="email"
                />
              </label>
              <button className="table-action" type="submit">
                重新發送驗證電郵
              </button>
            </form>
          </div>

          {isDemoMode() && (
            <div className="demo-access">
              <span>而家係開發預覽，可以直接試用</span>
              <div>
                <form action={signInDemo}>
                  <input name="role" type="hidden" value="member" />
                  <button className="table-action" type="submit">
                    試用會員中心
                  </button>
                </form>
                <form action={signInDemo}>
                  <input name="role" type="hidden" value="admin" />
                  <button className="table-action" type="submit">
                    試用 Admin
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
