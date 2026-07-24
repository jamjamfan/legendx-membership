import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  type CourseDefinition,
  formatHkd,
} from "@/lib/domain/catalog";

export function CourseStageCard({
  course,
}: {
  course: CourseDefinition;
}) {
  const price = course.membershipFee
    ? course.price + course.membershipFee
    : course.price;

  return (
    <article className="stage-card">
      <span className="stage-number">
        STAGE {String(course.stage).padStart(2, "0")} · {course.name}
      </span>
      <h3>{course.title}</h3>
      <p>{course.summary}</p>
      <ul className="stage-points">
        {course.outcomes.map((outcome) => (
          <li key={outcome}>{outcome}</li>
        ))}
      </ul>
      <div className="stage-meta">
        <span className="stage-price">
          {formatHkd(price)}
          <small>
            {course.membershipFee
              ? `包括一次性會員費 ${formatHkd(course.membershipFee)}`
              : course.referralPrice
                ? `介紹價 ${formatHkd(course.referralPrice)}`
                : "完成上一階段後可報讀"}
          </small>
        </span>
        <Link
          className="stage-arrow"
          href={`/course/${course.stage}`}
          aria-label={`了解${course.title}`}
        >
          <ArrowUpRight size={19} aria-hidden />
        </Link>
      </div>
    </article>
  );
}
