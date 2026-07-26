import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CircleCheck,
  MessageCircleMore,
  Quote,
  ShieldCheck,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { PromoViewTracker } from "@/components/promo-view-tracker";
import { submitPromoInquiry } from "@/app/p/actions";
import { getCurrentStageRegistration } from "@/lib/data/current-stage-registration";
import { STAGE_ONE_WHATSAPP_URL } from "@/lib/domain/catalog";
import { isDemoMode } from "@/lib/runtime";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `朋友推薦你參加 LegendX 財技班 · ${code.toUpperCase()}`,
    description:
      "三個晚上，從財商覺醒到時間自由藍圖；經朋友推薦可享專屬介紹價。",
  };
}

export default async function PromoPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { code: rawCode } = await params;
  const query = await searchParams;
  const code = rawCode.toUpperCase();
  const admin = createSupabaseAdminClient();
  const registration = await getCurrentStageRegistration(1);
  const [{ data: profile }, { data: promoContent }] = admin
    ? await Promise.all([
        admin
          .from("profiles")
          .select("display_name")
          .eq("referral_code", code)
          .maybeSingle(),
        admin
          .from("promo_content")
          .select("headline, subheadline, benefits, brand_story")
          .eq("status", "published")
          .maybeSingle(),
      ])
    : [{ data: null }, { data: null }];

  if (admin && !profile) notFound();
  if (!admin && !isDemoMode()) notFound();

  const referrer =
    profile?.display_name ??
    (code === "GOLD8888" ? "陳嘉明" : "一位 LegendX 會員");
  const headline = promoContent?.headline ?? "從財商覺醒，到時間自由";
  const subheadline =
    promoContent?.subheadline ??
    "將賺錢、理財、投資、借貸、生活成本、AI 微創業及被動收入，整合成一套屬於你的系統。";
  const brandStory =
    promoContent?.brand_story ??
    "並非毋須工作，亦非即時退休；而是逐步讓收入不再完全依賴每日上班。";
  const benefits = Array.isArray(promoContent?.benefits)
    ? (promoContent.benefits.filter(
        (item): item is string => typeof item === "string",
      ) as string[])
    : [
        "建立時間自由系統",
        "拆解 HK$30,000 規劃目標",
        "用 AI 微創業開拓收入可能",
      ];
  const registrationHref = registration
    ? `/order/${registration.id}?already=1`
    : `/register?stage=1&ref=${encodeURIComponent(code)}`;

  return (
    <main className="promo-page">
      <PromoViewTracker code={code} />
      <header className="promo-header shell">
        <Link href="/">
          <BrandMark />
        </Link>
        <Link href={registrationHref}>
          {registration ? "查看已報名訂單" : "用介紹價報名"}
          {registration ? (
            <CircleCheck size={15} aria-hidden />
          ) : (
            <ArrowRight size={15} aria-hidden />
          )}
        </Link>
      </header>

      <section className="promo-hero shell">
        <div className="promo-hero-copy">
          <p className="eyebrow">Recommended by {referrer}</p>
          <h1>
            {headline}，
            <br />
            <em>值得與你分享。</em>
          </h1>
          <p>{referrer} 誠意推薦你認識 LegendX。{subheadline}</p>
          <div className="promo-price">
            <span>第一階段介紹價</span>
            <strong>HK$880</strong>
            <small>原價 HK$980 · 介紹碼 {code}</small>
          </div>
          <div className="promo-cta-stack">
            {registration && (
              <div className="form-alert is-success">
                你已經報讀第一階段，毋須再次付款。
              </div>
            )}
            <Link
              className={`button ${
                registration ? "button-outline" : "button-primary"
              }`}
              href={registrationHref}
            >
              {registration ? (
                <>
                  <CircleCheck size={16} aria-hidden />
                  已報名 · 查看訂單
                </>
              ) : (
                <>
                  使用此介紹碼開始
                  <ArrowRight size={16} aria-hidden />
                </>
              )}
            </Link>
            {!registration && (
              <a
                className="button button-whatsapp"
                href={STAGE_ONE_WHATSAPP_URL}
                rel="noreferrer"
                target="_blank"
              >
                <MessageCircleMore size={16} aria-hidden />
                WhatsApp 預留名額
              </a>
            )}
          </div>
        </div>
        <div className="promo-quote">
          <Quote size={30} aria-hidden />
          <blockquote>
            {brandStory}
          </blockquote>
          <span>LEGENDX · LEARN, BUILD, PASS IT ON</span>
        </div>
      </section>

      <section className="promo-path">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Three-stage path</p>
              <h2>從看清方向，到建立影響力。</h2>
            </div>
            <p>
              三個階段彼此相連，每一步均有清晰成果，亦能掌握下一步方向。
            </p>
          </div>
          <div className="promo-stage-list">
            {[
              ["01", "財技覺醒", benefits[0] ?? "建立時間自由系統"],
              ["02", "收入藍圖", benefits[1] ?? "拆解可計算目標"],
              ["03", "AI 微創業", benefits[2] ?? "開拓收入可能"],
            ].map(([number, label, title]) => (
              <div key={number}>
                <span>{number}</span>
                <small>{label}</small>
                <strong>{title}</strong>
                <CircleCheck size={18} aria-hidden />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="promo-inquiry" id="inquiry">
        <div className="shell promo-inquiry-grid">
          <div>
            <p className="eyebrow">Ask first</p>
            <h2>尚未決定報名？請先留下你想了解的內容。</h2>
            <p>
              LegendX 職員會聯絡你並作跟進。
            </p>
            <span>
              <ShieldCheck size={16} aria-hidden />
              電話只用作回覆查詢；推廣訊息會獨立徵求同意。
            </span>
          </div>
          <form action={submitPromoInquiry} className="form-stack inquiry-form">
            <input name="code" type="hidden" value={code} />
            <input
              aria-hidden
              autoComplete="off"
              className="hp-field"
              name="website"
              tabIndex={-1}
            />
            {query.success && (
              <div className="form-alert is-success">
                查詢已收到。LegendX 職員會盡快聯絡你。
              </div>
            )}
            {query.error && <div className="form-alert is-error">{query.error}</div>}
            <label>
              <span>姓名</span>
              <input name="name" placeholder="你的稱呼" required />
            </label>
            <label>
              <span>電話</span>
              <input name="phone" placeholder="香港流動電話" required type="tel" />
            </label>
            <label>
              <span>想了解甚麼？</span>
              <textarea
                name="message"
                placeholder="例如：想查詢 8 月班的上課時間"
              />
            </label>
            <label className="inline-check">
              <input
                defaultChecked
                name="privacyAccepted"
                required
                type="checkbox"
              />
              <span>
                我已閱讀並同意 <Link href="/privacy">收集個人資料聲明</Link>
              </span>
            </label>
            <label className="inline-check">
              <input name="marketingConsent" type="checkbox" />
              <span>我願意接收日後財富知識及課程優惠（選填）</span>
            </label>
            <button className="button button-dark" type="submit">
              <MessageCircleMore size={16} aria-hidden />
              送出查詢
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
