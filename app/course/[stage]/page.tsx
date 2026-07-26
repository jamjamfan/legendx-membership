import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CircleCheck,
  Clock3,
  MapPin,
  MessageCircleMore,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentStageRegistration } from "@/lib/data/current-stage-registration";
import { getPublicSessions } from "@/lib/data/public-sessions";
import {
  courses,
  formatHkd,
  STAGE_ONE_TRANSIT,
  STAGE_ONE_VENUE,
  STAGE_ONE_WHATSAPP_URL,
  type CourseStage,
} from "@/lib/domain/catalog";

const financialSystem = [
  "賺錢",
  "理錢",
  "投資",
  "借貸",
  "生活成本",
  "AI 微創業",
  "被動收入",
] as const;

function getCourse(stageParam: string) {
  const stage = Number(stageParam) as CourseStage;
  return courses.find((course) => course.stage === stage);
}

export function generateStaticParams() {
  return courses.map((course) => ({ stage: String(course.stage) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stage: string }>;
}): Promise<Metadata> {
  const { stage } = await params;
  const course = getCourse(stage);
  if (!course) return {};
  return {
    title: `第 ${course.stage} 階段 · ${course.title}`,
    description: course.summary,
  };
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ stage: string }>;
}) {
  const { stage: stageParam } = await params;
  const course = getCourse(stageParam);
  if (!course) notFound();

  const [sessions, registration] = await Promise.all([
    getPublicSessions(course.stage),
    getCurrentStageRegistration(course.stage),
  ]);
  const displayPrice = course.price + (course.membershipFee ?? 0);
  const registrationHref = registration
    ? `/order/${registration.id}?already=1`
    : `/checkout/${course.stage}`;

  return (
    <>
      <main className="course-page">
        <header className="course-topbar shell">
          <Link href="/">
            <ArrowLeft size={15} aria-hidden />
            返回首頁
          </Link>
          <nav aria-label="課程階段">
            {courses.map((item) => (
              <Link
                aria-current={item.stage === course.stage ? "page" : undefined}
                href={`/course/${item.stage}`}
                key={item.stage}
              >
                {String(item.stage).padStart(2, "0")}
              </Link>
            ))}
          </nav>
          <Link
            href={
              registration
                ? registrationHref
                : `/register?stage=${course.stage}`
            }
          >
            {registration ? "查看已報名訂單" : "建立帳戶"}
          </Link>
        </header>

        <section
          className={`course-hero shell ${course.stage === 1 ? "is-finance-course" : ""}`}
        >
          {course.stage === 1 ? (
            <div className="course-poster-card">
              <Image
                alt="LegendX 財技班海報：由財商覺醒到每月三萬元被動收入藍圖"
                height={941}
                priority
                sizes="(max-width: 760px) 82vw, 390px"
                src="/poster-stage1.jpg"
                width={529}
              />
              <span>LegendX original programme · 2026</span>
            </div>
          ) : (
            <div className="course-stage-mark">
              <span>STAGE</span>
              <strong>{String(course.stage).padStart(2, "0")}</strong>
            </div>
          )}
          <div className="course-hero-copy">
            <p className="eyebrow">
              LegendX programme · {course.name}
            </p>
            <h1>{course.title}</h1>
            <p>{course.summary}</p>
            {course.faculty && (
              <div className="course-faculty" aria-label="課程導師">
                {course.faculty.map((faculty) => (
                  <span key={faculty}>
                    <UserRound size={14} aria-hidden />
                    {faculty}
                  </span>
                ))}
              </div>
            )}
            <div className="course-price-row">
              <span>
                {formatHkd(displayPrice)}
                <small>
                  {course.referralPrice
                    ? `持有效介紹碼：${formatHkd(course.referralPrice)}`
                    : course.membershipFee
                      ? `包括一次性會員費 ${formatHkd(course.membershipFee)}`
                      : "完成第二階段後可以報讀"}
                </small>
              </span>
              <div className="course-price-actions">
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
                      選擇場次並報名
                      <ArrowRight size={16} aria-hidden />
                    </>
                  )}
                </Link>
                {course.stage === 1 && !registration && (
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
          </div>
        </section>

        {course.stage === 1 && (
          <section className="freedom-blueprint">
            <div className="shell freedom-blueprint-grid">
              <div>
                <p className="eyebrow">Your time-freedom system</p>
                <h2>
                  並非賭一個機會，
                  <br />
                  而是建立一套能夠運行的系統。
                </h2>
                <p>
                  逐步讓收入不再完全依賴每日上班。課堂以每月
                  HK$30,000
                  作為規劃目標，將每個組件逐一計算、排序及驗證。
                </p>
                <div className="system-chip-list" aria-label="時間自由系統組件">
                  {financialSystem.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
              <div className="blueprint-target">
                <Target size={28} aria-hidden />
                <small>PLANNING TARGET</small>
                <strong>HK$30,000</strong>
                <span>每月被動收入藍圖</span>
              </div>
            </div>
          </section>
        )}

        <section className="course-content shell">
          <div className="course-outcomes">
            <p className="eyebrow">What you will build</p>
            <h2>
              {course.stage === 1
                ? "三個晚上，規劃屬於自己的時間自由路線。"
                : "完成這個階段，你所獲得的不只是筆記。"}
            </h2>
            <div className="outcome-list">
              {course.outcomes.map((outcome, index) => (
                <div key={outcome}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{outcome}</strong>
                </div>
              ))}
            </div>
          </div>
          <aside className="course-principle">
            <Sparkles size={22} aria-hidden />
            <p>
              {course.stage === 1
                ? "並非毋須工作，亦非即時退休；而是從今天開始，逐步建立不只依靠出售時間的收入結構。"
                : course.stage === 2
                  ? "第二階段將方法應用於真實情境，透過練習及回饋縮短「明白」與「做到」之間的距離。"
                  : "第三階段將個人成果整理為可以分享、帶領及傳承的價值。"}
            </p>
          </aside>
        </section>

        {course.lessons && (
          <section className="course-lessons">
            <div className="shell">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Three-night curriculum</p>
                  <h2>三晚課程，每一晚完成一塊藍圖。</h2>
                </div>
                <p>
                  每晚 19:00–22:30，從財商覺醒、收入公式，逐步延伸至 AI
                  微創業及可計算的行動路線。
                </p>
              </div>
              <div className="lesson-card-grid">
                {course.lessons.map((lesson, index) => (
                  <article className="lesson-card" key={lesson.title}>
                    <div className="lesson-card-heading">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <small>{lesson.focus}</small>
                    </div>
                    <h3>{lesson.title}</h3>
                    <ul>
                      {lesson.items.map((item) => (
                        <li key={item}>
                          <CircleCheck size={15} aria-hidden />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
              <p className="finance-disclaimer">
                教學內容只供教育及一般資訊用途，不構成投資、借貸或財務建議；課堂提及的收入數字均為規劃示例及學習目標，不代表或保證任何實際收入或投資回報。
              </p>
            </div>
          </section>
        )}

        <section className="course-sessions">
          <div className="shell">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Upcoming sessions</p>
                <h2>
                  {course.stage === 1
                    ? "選擇財技 3 班或財技 4 班。"
                    : "選擇一個適合你的場次。"}
                </h2>
              </div>
              <p>
                {course.stage === 1
                  ? `${STAGE_ONE_VENUE} · ${STAGE_ONE_TRANSIT}`
                  : "完整課室地址將於付款確認後，顯示在會員中心及課堂通行證。"}
              </p>
            </div>

            <div className="session-list">
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <article className="session-card" key={session.id}>
                    <div>
                      <span className="stage-number">
                        {session.seatsRemaining > 0
                          ? `尚餘 ${session.seatsRemaining} 位`
                          : "場次已滿"}
                      </span>
                      <h3>{session.title}</h3>
                    </div>
                    <div className="session-facts">
                      <span>
                        <CalendarDays size={16} aria-hidden />
                        {session.dateLabel}
                      </span>
                      <span>
                        <Clock3 size={16} aria-hidden />
                        {session.timeLabel}
                      </span>
                      <span>
                        <MapPin size={16} aria-hidden />
                        {course.stage === 1
                          ? `${session.area} · ${STAGE_ONE_TRANSIT}`
                          : session.area}
                      </span>
                      <span>
                        <UserRound size={16} aria-hidden />
                        {session.instructor}
                      </span>
                    </div>
                    <Link
                      className={`button ${
                        registration
                          ? "button-outline"
                          : session.seatsRemaining > 0
                            ? "button-dark"
                            : "button-outline"
                      }`}
                      href={
                        registration
                          ? registrationHref
                          : session.seatsRemaining > 0
                          ? `/checkout/${course.stage}?session=${session.id}`
                          : `/waitlist?session=${session.id}`
                      }
                    >
                      {registration ? (
                        <>
                          <CircleCheck size={16} aria-hidden />
                          已報名 · 查看訂單
                        </>
                      ) : session.seatsRemaining > 0 ? (
                        "報讀這一班"
                      ) : (
                        "加入候補"
                      )}
                    </Link>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <CalendarDays size={24} aria-hidden />
                  <h3>新場次準備中</h3>
                  <p>你可以先建立帳戶；新場次將顯示於會員中心。</p>
                  <Link className="button button-dark" href="/register">
                    建立帳戶
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
