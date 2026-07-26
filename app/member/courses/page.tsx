import Link from "next/link";
import { ArrowRight, CalendarDays, CircleCheck, LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { getCurrentMember } from "@/lib/data/current-member";
import { courses } from "@/lib/domain/catalog";

export default async function MemberCoursesPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login?next=/member/courses");

  return (
    <PortalShell
      variant="member"
      activeHref="/member/courses"
      userName={member.displayName}
    >
      <main className="portal-main">
        <div className="portal-heading">
          <div>
            <p className="eyebrow">My courses</p>
            <h1>我的課程</h1>
            <p>已完成、進行中及可升級的階段。</p>
          </div>
        </div>
        <section className="portal-grid portal-grid-3">
          {courses.map((course) => {
            const complete = course.stage <= member.highestCompletedStage;
            const unlocked = course.stage <= member.highestCompletedStage + 1;
            return (
              <article className="panel course-portal-card" key={course.stage}>
                <span className="stage-number">
                  STAGE {String(course.stage).padStart(2, "0")}
                </span>
                <h2>{course.title}</h2>
                <p>{course.summary}</p>
                <div className="course-card-state">
                  {complete ? (
                    <>
                      <CircleCheck size={17} aria-hidden />
                      已完成
                    </>
                  ) : unlocked ? (
                    <>
                      <CalendarDays size={17} aria-hidden />
                      可以報讀
                    </>
                  ) : (
                    <>
                      <LockKeyhole size={17} aria-hidden />
                      完成上一階段後解鎖
                    </>
                  )}
                </div>
                <Link
                  className={`button ${unlocked ? "button-dark" : "button-outline"}`}
                  href={unlocked ? `/course/${course.stage}` : "/member/courses"}
                  aria-disabled={!unlocked}
                >
                  {complete ? "重溫課程資料" : unlocked ? "查看場次" : "未解鎖"}
                  {unlocked && <ArrowRight size={15} aria-hidden />}
                </Link>
              </article>
            );
          })}
        </section>
      </main>
    </PortalShell>
  );
}
