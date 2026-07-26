import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  QrCode,
  Users,
} from "lucide-react";
import { CourseStageCard } from "@/components/course-stage-card";
import { ProgressionOrbit } from "@/components/progression-orbit";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { courses } from "@/lib/domain/catalog";

const scholarshipSlots = [
  { index: 1, programme: "第二階段名額", amount: "$1,000" },
  { index: 2, programme: "第二階段名額", amount: "$2,000" },
  { index: 3, programme: "第二階段名額", amount: "$3,800" },
] as const;

const stageThreeSlots = [
  { index: 1, programme: "第三階段名額", amount: "$1,000" },
  { index: 2, programme: "第三階段名額", amount: "$2,800" },
] as const;

const experiences = [
  {
    icon: QrCode,
    title: "一張通行證，帶你入課室",
    body: "會員中心集中顯示場次、倒數、完整地址及 QR 通行證；到場出示即可簽到。",
    mark: "QR",
  },
  {
    icon: CalendarDays,
    title: "每一步，都準時提醒",
    body: "上課前一日及三小時收到提醒，亦可一按加入自己的行事曆。",
    mark: "T−",
  },
  {
    icon: Users,
    title: "分享不靠估計，成果清晰可見",
    body: "專屬推廣頁、QR 及清晰數據，查詢、報名、付款及獎學金進度一目了然。",
    mark: "3+2",
  },
] as const;

function SlotRows({
  slots,
}: {
  slots: readonly {
    index: number;
    programme: string;
    amount: string;
  }[];
}) {
  return slots.map((slot) => (
    <div className="slot-row" key={`${slot.programme}-${slot.index}`}>
      <span className="slot-index">{slot.index}</span>
      <span className="slot-label">
        <strong>第 {slot.index} 位朋友</strong>
        <small>{slot.programme}</small>
      </span>
      <span className="slot-amount">{slot.amount}</span>
    </div>
  ));
}

export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#main">
        跳到主要內容
      </a>
      <SiteHeader />

      <main id="main">
        <section className="hero">
          <div className="shell hero-grid">
            <div>
              <p className="eyebrow">Hong Kong · Professional Academy</p>
              <h1>
                <span className="hero-line">學識，成事，</span>
                <span className="hero-line">
                  再<em>成就別人。</em>
                </span>
              </h1>
              <p className="hero-lede">
                LegendX
                將探索、實踐及傳承連成一條完整路線。你獲得的不只是課堂，而是一套可以持續實踐及驗證的成長系統。
              </p>
              <div className="hero-actions">
                <Link className="button button-primary" href="/course/1">
                  由 $980 財技班開始
                  <ArrowRight size={17} aria-hidden />
                </Link>
                <Link className="button button-secondary" href="#programme">
                  了解三個階段
                </Link>
              </div>
              <p className="hero-note">
                <CircleCheck size={14} aria-hidden />
                三晚財技班 · 19:00–22:30 · 有介紹碼專享 HK$880
              </p>
            </div>
            <ProgressionOrbit />
          </div>
        </section>

        <section className="section programme" id="programme">
          <div className="shell">
            <div className="section-heading">
              <div>
                <p className="eyebrow">The programme</p>
                <h2>三個階段，並非三個分散的課程。</h2>
              </div>
              <p>
                每個階段均有清晰目的、成果及下一步。從財商覺醒及時間自由藍圖，到將方法轉化為成果，再把你累積的價值傳承下去。
              </p>
            </div>
            <div className="stage-grid">
              {courses.map((course) => (
                <CourseStageCard course={course} key={course.stage} />
              ))}
            </div>
          </div>
        </section>

        <section className="section scholarship" id="scholarship">
          <div className="shell scholarship-grid">
            <div className="scholarship-copy">
              <p className="eyebrow">LegendX scholarship</p>
              <h2>將你的推薦，成為下一位學員的起點。</h2>
              <p>
                完成進階階段後，你將獲得清晰、有時限的獎學金名額。朋友使用你的介紹碼開始第一階段，可享有介紹價；你的回贈亦會逐筆記錄並透明結算。
              </p>
            </div>

            <div className="scholarship-ledger" aria-label="獎學金回贈示例">
              <div className="ledger-header">
                <span>SCHOLARSHIP LEDGER</span>
                <small>名額有效期 180 日</small>
              </div>
              <div className="ledger-group">
                <div className="ledger-group-title">
                  <strong>完成第二階段 · 3 個名額</strong>
                  <span>總值 HK$6,800</span>
                </div>
                <SlotRows slots={scholarshipSlots} />
              </div>
              <div className="ledger-group">
                <div className="ledger-group-title">
                  <strong>升級第三階段 · 再加 2 個名額</strong>
                  <span>總值 HK$3,800</span>
                </div>
                <SlotRows slots={stageThreeSlots} />
              </div>
            </div>
          </div>
        </section>

        <section className="section experience" id="experience">
          <div className="shell">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Member experience</p>
                <h2>課前、上課及分享，均在同一平台完成。</h2>
              </div>
              <p>
                會員中心並非只是存放資料的地方，而是讓你每次登入後均能掌握下一步的個人控制台。
              </p>
            </div>
            <div className="experience-grid">
              {experiences.map((experience) => {
                const Icon = experience.icon;
                return (
                  <article className="experience-card" key={experience.title}>
                    <span className="experience-icon">
                      <Icon size={21} aria-hidden />
                    </span>
                    <h3>{experience.title}</h3>
                    <p>{experience.body}</p>
                    <span className="experience-mark" aria-hidden>
                      {experience.mark}
                    </span>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section closing">
          <div className="shell closing-content">
            <h2>你的第一步，毋須等待至準備十足。</h2>
            <p>
              先用三個晚上，將七種財務決策整合成自己的時間自由系統。如由朋友介紹，使用介紹碼報名時將自動套用專屬價格。
            </p>
            <Link className="button button-primary" href="/course/1">
              查看財技班完整內容
              <ArrowRight size={17} aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
