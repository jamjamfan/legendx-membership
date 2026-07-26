import { NextResponse } from "next/server";
import { sendTransactionalEmail } from "@/lib/integrations/email";
import { sendWhatsappTemplate } from "@/lib/integrations/whatsapp";
import { hasValidBearerToken } from "@/lib/security/secrets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface NotificationPayload {
  email?: string;
  phone?: string;
  displayName?: string;
  lessonTitle?: string;
  sessionTitle?: string;
  startsAt?: string;
  area?: string;
  venueName?: string;
  offset?: string;
  subject?: string;
  body?: string;
}

interface ClaimedNotificationJob {
  id: string;
  channel: "email" | "whatsapp" | "in_app";
  template_key: string;
  payload: NotificationPayload;
  idempotency_key: string;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}

function lessonEmail(payload: NotificationPayload): {
  subject: string;
  html: string;
} {
  const displayName = escapeHtml(payload.displayName ?? "學員");
  const sessionTitle = escapeHtml(payload.sessionTitle ?? "LegendX 課堂");
  const lessonTitle = escapeHtml(payload.lessonTitle ?? sessionTitle);
  const startsAt = payload.startsAt
    ? new Intl.DateTimeFormat("zh-HK", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Asia/Hong_Kong",
      }).format(new Date(payload.startsAt))
    : "請登入會員中心查看";
  const venue = escapeHtml(
    [payload.venueName, payload.area].filter(Boolean).join(" · "),
  );
  return {
    subject: `LegendX 上課提醒｜${sessionTitle}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.7;color:#071827"><h2>${displayName}，請準備參與下一堂課。</h2><p><strong>${lessonTitle}</strong></p><p>${startsAt}<br>${venue}</p><p>完整資料及課堂通行證已上載至會員中心。</p></div>`,
  };
}

export async function GET(request: Request) {
  if (
    !hasValidBearerToken(
      request.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "database_not_configured" },
      { status: 503 },
    );
  }

  const [expiredResult, queuedResult] = await Promise.all([
    admin.rpc("expire_stale_reservations"),
    admin.rpc("enqueue_lesson_reminders"),
  ]);
  if (expiredResult.error || queuedResult.error) {
    return NextResponse.json(
      {
        error: "scheduler_failed",
        expiredError: expiredResult.error?.message,
        queuedError: queuedResult.error?.message,
      },
      { status: 500 },
    );
  }

  const { data: jobs, error: claimError } = await admin.rpc(
    "claim_notification_jobs",
    { p_limit: 50 },
  );
  if (claimError) {
    return NextResponse.json(
      { error: "claim_failed", detail: claimError.message },
      { status: 500 },
    );
  }

  const results = await Promise.all(
    ((jobs ?? []) as ClaimedNotificationJob[]).map(async (job) => {
      const payload = (job.payload ?? {}) as NotificationPayload;
      try {
        if (job.channel === "email") {
          if (!payload.email) throw new Error("recipient_email_missing");
          const content =
            job.template_key === "lesson_reminder"
              ? lessonEmail(payload)
              : {
                  subject: payload.subject ?? "LegendX 通知",
                  html: `<div style="font-family:Arial,sans-serif;line-height:1.7;color:#071827">${escapeHtml(payload.body ?? "")}</div>`,
                };
          const delivery = await sendTransactionalEmail({
            to: payload.email,
            subject: content.subject,
            html: content.html,
            idempotencyKey: job.idempotency_key,
          });
          if (!delivery.delivered) throw new Error(delivery.reason);
          await admin
            .from("notification_jobs")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              provider_message_id: delivery.providerId,
              last_error: null,
            })
            .eq("id", job.id);
          return { id: job.id, status: "sent" };
        }

        if (job.channel === "whatsapp") {
          if (!payload.phone) throw new Error("recipient_phone_missing");
          const delivery = await sendWhatsappTemplate({
            to: payload.phone,
            templateName:
              process.env.META_WHATSAPP_REMINDER_TEMPLATE ??
              "legendx_lesson_reminder",
            bodyParameters: [
              payload.displayName ?? "學員",
              payload.sessionTitle ?? "LegendX 課堂",
              payload.startsAt ?? "",
            ],
          });
          if (!delivery.delivered) throw new Error(delivery.reason);
          await admin
            .from("notification_jobs")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              provider_message_id: delivery.providerId,
              last_error: null,
            })
            .eq("id", job.id);
          return { id: job.id, status: "sent" };
        }

        await admin
          .from("notification_jobs")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", job.id);
        return { id: job.id, status: "sent" };
      } catch (error) {
        const lastError =
          error instanceof Error ? error.message.slice(0, 500) : "unknown_error";
        await admin
          .from("notification_jobs")
          .update({ status: "failed", last_error: lastError })
          .eq("id", job.id);
        return { id: job.id, status: "failed", error: lastError };
      }
    }),
  );

  return NextResponse.json({
    expiredReservations: expiredResult.data ?? 0,
    queuedReminders: queuedResult.data ?? 0,
    processed: results.length,
    sent: results.filter((result) => result.status === "sent").length,
    failed: results.filter((result) => result.status === "failed").length,
  });
}
