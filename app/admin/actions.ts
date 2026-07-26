"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getStaffContext } from "@/lib/auth/staff";
import { getRebateAttendanceStatus } from "@/lib/data/rebate-attendance";
import { createStripeClient } from "@/lib/integrations/stripe";
import { createZoomMeeting } from "@/lib/integrations/zoom";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function done(path: string, message: string): never {
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent(message)}`);
}

async function requireStaff(path: string) {
  const context = await getStaffContext();
  if (!context) fail(path, "需要職員權限");
  return context;
}

const idSchema = z.object({ id: z.string().uuid() });

export async function markOrderPaid(formData: FormData) {
  const parsed = idSchema.safeParse({ id: formData.get("orderId") });
  if (!parsed.success) fail("/admin/orders", "訂單資料不正確");
  const { admin, actorId } = await requireStaff("/admin/orders");

  const { data: order } = await admin
    .from("orders")
    .select("id, payment_method")
    .eq("id", parsed.data.id)
    .in("status", ["pending_payment", "payment_review"])
    .maybeSingle();
  if (!order || order.payment_method === "stripe") {
    fail("/admin/orders", "Stripe 訂單只可以由 webhook 確認");
  }

  const { error } = await admin.rpc("complete_paid_order", {
    p_order_id: order.id,
    p_actor_id: actorId,
  });
  if (error) fail("/admin/orders", "未能確認收款");

  await admin
    .from("payments")
    .update({
      status: "succeeded",
      confirmed_by: actorId,
      confirmed_at: new Date().toISOString(),
    })
    .eq("order_id", order.id);
  done("/admin/orders", "收款已確認，座位及獎學金規則已同步");
}

export async function approveRefund(formData: FormData) {
  const parsed = idSchema.safeParse({ id: formData.get("refundId") });
  if (!parsed.success) fail("/admin/orders", "退款資料不正確");
  const { admin, actorId } = await requireStaff("/admin/orders");

  const { data: refund } = await admin
    .from("refund_requests")
    .select("id, order_id, status")
    .eq("id", parsed.data.id)
    .in("status", ["requested", "approved"])
    .maybeSingle();
  if (!refund) fail("/admin/orders", "退款申請已處理或不存在");

  const [{ data: order }, { data: payment }] = await Promise.all([
    admin
      .from("orders")
      .select("id, payment_method, amount_cents")
      .eq("id", refund.order_id)
      .maybeSingle(),
    admin
      .from("payments")
      .select("id, provider_payment_id, provider_metadata, status")
      .eq("order_id", refund.order_id)
      .maybeSingle(),
  ]);
  if (!order || !payment) fail("/admin/orders", "找不到原付款記錄");

  if (order.payment_method === "stripe") {
    const stripe = createStripeClient();
    if (!stripe) fail("/admin/orders", "Stripe 尚未設定");
    const metadata =
      payment.provider_metadata &&
      typeof payment.provider_metadata === "object" &&
      !Array.isArray(payment.provider_metadata)
        ? (payment.provider_metadata as Record<string, unknown>)
        : {};
    let paymentIntent =
      typeof metadata.payment_intent === "string"
        ? metadata.payment_intent
        : null;
    if (!paymentIntent && payment.provider_payment_id?.startsWith("cs_")) {
      const checkout = await stripe.checkout.sessions.retrieve(
        payment.provider_payment_id,
      );
      paymentIntent =
        typeof checkout.payment_intent === "string"
          ? checkout.payment_intent
          : checkout.payment_intent?.id ?? null;
    }
    if (!paymentIntent) fail("/admin/orders", "Stripe PaymentIntent 遺失");
    await stripe.refunds.create(
      {
        payment_intent: paymentIntent,
        amount: order.amount_cents,
        metadata: { orderId: order.id, refundRequestId: refund.id },
      },
      { idempotencyKey: `refund:${refund.id}` },
    );
  }

  const { error } = await admin.rpc("complete_refund", {
    p_refund_id: refund.id,
    p_actor_id: actorId,
  });
  if (error) fail("/admin/orders", "外部退款完成，但內部狀態同步失敗");
  done("/admin/orders", "退款已完成，座位及相關獎學金已同步調整");
}

const rejectSchema = z.object({
  id: z.string().uuid(),
  response: z.string().trim().min(3).max(2000),
});

export async function rejectRefund(formData: FormData) {
  const parsed = rejectSchema.safeParse({
    id: formData.get("refundId"),
    response: formData.get("response"),
  });
  if (!parsed.success) fail("/admin/orders", "請填寫拒絕原因");
  const { admin, actorId } = await requireStaff("/admin/orders");
  const { error } = await admin.rpc("reject_refund", {
    p_refund_id: parsed.data.id,
    p_actor_id: actorId,
    p_response: parsed.data.response,
  });
  if (error) fail("/admin/orders", "未能拒絕退款");
  done("/admin/orders", "退款申請已拒絕並通知營運佇列");
}

const settleSchema = z.object({
  id: z.string().uuid(),
  note: z.string().trim().max(500).optional(),
});

export async function settleRebate(formData: FormData) {
  const parsed = settleSchema.safeParse({
    id: formData.get("rebateId"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) fail("/admin/rebates", "獎學金資料不正確");
  const { admin, actorId } = await requireStaff("/admin/rebates");
  const { data: rebate } = await admin
    .from("rebate_records")
    .select("id, referred_order_id, referred_member_id, status")
    .eq("id", parsed.data.id)
    .eq("status", "pending")
    .maybeSingle();
  if (!rebate) fail("/admin/rebates", "獎學金已處理或不存在");
  const attendance = await getRebateAttendanceStatus(
    admin,
    rebate.referred_order_id,
    rebate.referred_member_id,
  );
  if (!attendance.eligible) {
    fail(
      "/admin/rebates",
      `朋友尚未完成全部課堂入場及離場記錄（${attendance.completedLessons}/${attendance.totalLessons} 堂）`,
    );
  }
  const { error } = await admin.rpc("settle_rebate", {
    p_rebate_id: parsed.data.id,
    p_actor_id: actorId,
    p_note: parsed.data.note ?? null,
  });
  if (error) fail("/admin/rebates", "未能完成獎學金結算");
  done("/admin/rebates", "獎學金已標記為已轉帳並寫入帳本");
}

const advanceMemberStageSchema = z.object({
  memberId: z.string().uuid(),
  stage: z.coerce.number().int().min(1).max(3),
});

export async function advanceMemberStage(formData: FormData) {
  const parsed = advanceMemberStageSchema.safeParse({
    memberId: formData.get("memberId"),
    stage: formData.get("stage"),
  });
  if (!parsed.success) fail("/admin/members", "會員階段資料不正確");
  const { admin, actorId } = await requireStaff("/admin/members");
  const { data: profile } = await admin
    .from("profiles")
    .select("id, display_name, highest_completed_stage")
    .eq("id", parsed.data.memberId)
    .maybeSingle();
  if (!profile) fail("/admin/members", "會員不存在");
  if (profile.highest_completed_stage >= parsed.data.stage) {
    fail("/admin/members", "會員已經完成這個階段");
  }
  if (parsed.data.stage > profile.highest_completed_stage + 1) {
    fail("/admin/members", "只可以逐階段完成課程");
  }

  const { error } = await admin
    .from("profiles")
    .update({ highest_completed_stage: parsed.data.stage })
    .eq("id", profile.id)
    .eq("highest_completed_stage", profile.highest_completed_stage);
  if (error) fail("/admin/members", "未能更新會員階段");

  await admin.from("audit_logs").insert({
    actor_id: actorId,
    action: "member.stage_advance",
    entity_type: "profile",
    entity_id: profile.id,
    before_data: { highest_completed_stage: profile.highest_completed_stage },
    after_data: {
      highest_completed_stage: parsed.data.stage,
      method: "admin_override",
    },
  });
  done(
    "/admin/members",
    `${profile.display_name} 已完成第 ${parsed.data.stage} 階段，可測試下一階段`,
  );
}

const inquirySchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["contacted", "converted", "closed"]),
});

export async function updateInquiry(formData: FormData) {
  const parsed = inquirySchema.safeParse({
    id: formData.get("inquiryId"),
    status: formData.get("status"),
  });
  if (!parsed.success) fail("/admin/inquiries", "查詢資料不正確");
  const { admin, actorId } = await requireStaff("/admin/inquiries");
  const { data: before } = await admin
    .from("inquiries")
    .select()
    .eq("id", parsed.data.id)
    .maybeSingle();
  const { error } = await admin
    .from("inquiries")
    .update({
      status: parsed.data.status,
      last_contacted_at:
        parsed.data.status === "contacted" ? new Date().toISOString() : undefined,
    })
    .eq("id", parsed.data.id);
  if (error) fail("/admin/inquiries", "未能更新查詢");
  await admin.from("audit_logs").insert({
    actor_id: actorId,
    action: "inquiry.status_update",
    entity_type: "inquiry",
    entity_id: parsed.data.id,
    before_data: before,
    after_data: { status: parsed.data.status },
  });
  done("/admin/inquiries", "查詢狀態已更新");
}

const sessionSchema = z.object({
  stage: z.coerce.number().int().min(1).max(3),
  title: z.string().trim().min(3).max(160),
  area: z.string().trim().min(2).max(80),
  venueName: z.string().trim().max(160).optional(),
  fullAddress: z.string().trim().max(500).optional(),
  instructor: z.string().trim().min(2).max(120),
  capacity: z.coerce.number().int().min(1).max(500),
  startsAt: z.string().min(10),
  endsAt: z.string().min(10),
  createZoom: z.boolean(),
});

function hongKongIso(value: string): string {
  return new Date(
    /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}:00+08:00`,
  ).toISOString();
}

export async function createSession(formData: FormData) {
  const parsed = sessionSchema.safeParse({
    stage: formData.get("stage"),
    title: formData.get("title"),
    area: formData.get("area"),
    venueName: formData.get("venueName") || undefined,
    fullAddress: formData.get("fullAddress") || undefined,
    instructor: formData.get("instructor"),
    capacity: formData.get("capacity"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    createZoom: formData.get("createZoom") === "on",
  });
  if (!parsed.success) fail("/admin/sessions", "請填妥場次資料");
  const { admin, actorId } = await requireStaff("/admin/sessions");
  const startsAt = hongKongIso(parsed.data.startsAt);
  const endsAt = hongKongIso(parsed.data.endsAt);
  if (new Date(endsAt) <= new Date(startsAt)) {
    fail("/admin/sessions", "完結時間必須遲過開始時間");
  }

  const { data: course } = await admin
    .from("courses")
    .select("id")
    .eq("stage", parsed.data.stage)
    .maybeSingle();
  if (!course) fail("/admin/sessions", "課程階段不存在");

  const { data: session, error } = await admin
    .from("course_sessions")
    .insert({
      course_id: course.id,
      title: parsed.data.title,
      area: parsed.data.area,
      venue_name: parsed.data.venueName,
      full_address: parsed.data.fullAddress,
      instructor: parsed.data.instructor,
      capacity: parsed.data.capacity,
      status: "published",
      enrollment_opens_at: new Date().toISOString(),
      enrollment_closes_at: startsAt,
      starts_at: startsAt,
      ends_at: endsAt,
    })
    .select("id")
    .single();
  if (error || !session) fail("/admin/sessions", "未能建立場次");

  await admin.from("session_lessons").insert({
    session_id: session.id,
    title: parsed.data.title,
    starts_at: startsAt,
    ends_at: endsAt,
    position: 1,
  });

  if (parsed.data.createZoom) {
    const minutes = Math.max(
      15,
      Math.round(
        (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000,
      ),
    );
    const meeting = await createZoomMeeting({
      topic: parsed.data.title,
      startTime: startsAt,
      durationMinutes: minutes,
    });
    if (meeting.created) {
      await admin
        .from("course_sessions")
        .update({
          zoom_meeting_id: meeting.meetingId,
          zoom_join_url: meeting.joinUrl,
        })
        .eq("id", session.id);
    }
  }

  await admin.from("audit_logs").insert({
    actor_id: actorId,
    action: "session.create",
    entity_type: "course_session",
    entity_id: session.id,
  });
  done("/admin/sessions", "新場次已建立並開始招生");
}

const updateSessionSchema = sessionSchema.omit({ createZoom: true }).extend({
  id: z.string().uuid(),
  status: z.enum(["draft", "published", "full", "completed"]),
});

export async function updateSession(formData: FormData) {
  const parsed = updateSessionSchema.safeParse({
    id: formData.get("sessionId"),
    stage: formData.get("stage"),
    title: formData.get("title"),
    area: formData.get("area"),
    venueName: formData.get("venueName") || undefined,
    fullAddress: formData.get("fullAddress") || undefined,
    instructor: formData.get("instructor"),
    capacity: formData.get("capacity"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    status: formData.get("status"),
  });
  if (!parsed.success) fail("/admin/sessions", "請填妥場次資料");
  const { admin, actorId } = await requireStaff("/admin/sessions");
  const startsAt = hongKongIso(parsed.data.startsAt);
  const endsAt = hongKongIso(parsed.data.endsAt);
  if (new Date(endsAt) <= new Date(startsAt)) {
    fail("/admin/sessions", "完結時間必須遲過開始時間");
  }
  const { data: course } = await admin
    .from("courses")
    .select("id")
    .eq("stage", parsed.data.stage)
    .maybeSingle();
  if (!course) fail("/admin/sessions", "課程階段不存在");

  const { error } = await admin
    .from("course_sessions")
    .update({
      course_id: course.id,
      title: parsed.data.title,
      area: parsed.data.area,
      venue_name: parsed.data.venueName,
      full_address: parsed.data.fullAddress,
      instructor: parsed.data.instructor,
      capacity: parsed.data.capacity,
      status: parsed.data.status,
      enrollment_closes_at: startsAt,
      starts_at: startsAt,
      ends_at: endsAt,
    })
    .eq("id", parsed.data.id)
    .neq("status", "cancelled");
  if (error) fail("/admin/sessions", "未能更新場次");

  await admin
    .from("session_lessons")
    .update({
      title: parsed.data.title,
      starts_at: startsAt,
      ends_at: endsAt,
    })
    .eq("session_id", parsed.data.id)
    .eq("position", 1);
  await admin.from("audit_logs").insert({
    actor_id: actorId,
    action: "session.update",
    entity_type: "course_session",
    entity_id: parsed.data.id,
    after_data: { status: parsed.data.status },
  });
  done("/admin/sessions", "場次資料已更新");
}

export async function cancelSession(formData: FormData) {
  const parsed = idSchema.safeParse({ id: formData.get("sessionId") });
  if (!parsed.success) fail("/admin/sessions", "場次資料不正確");
  const { admin, actorId } = await requireStaff("/admin/sessions");
  const { data: session } = await admin
    .from("course_sessions")
    .select("id, title, status")
    .eq("id", parsed.data.id)
    .neq("status", "cancelled")
    .maybeSingle();
  if (!session) fail("/admin/sessions", "場次已取消或不存在");

  const { data: members } = await admin
    .from("enrollments")
    .select("member_id, profiles(email, phone, display_name)")
    .eq("session_id", session.id)
    .eq("status", "confirmed");
  const now = new Date().toISOString();
  const jobs = (members ?? []).flatMap((entry) => {
    const profile = Array.isArray(entry.profiles)
      ? entry.profiles[0]
      : entry.profiles;
    if (!profile) return [];
    const payload = {
      email: profile.email,
      phone: profile.phone,
      displayName: profile.display_name,
      subject: `LegendX 場次取消｜${session.title}`,
      body: `${session.title} 已取消。我們會另行聯絡你安排退款或轉班。`,
    };
    return [
      {
        member_id: entry.member_id,
        channel: "email" as const,
        template_key: "session_cancelled",
        payload,
        idempotency_key: `session-cancelled:${session.id}:${entry.member_id}:email`,
        scheduled_for: now,
      },
      ...(profile.phone
        ? [
            {
              member_id: entry.member_id,
              channel: "whatsapp" as const,
              template_key: "session_cancelled",
              payload,
              idempotency_key: `session-cancelled:${session.id}:${entry.member_id}:whatsapp`,
              scheduled_for: now,
            },
          ]
        : []),
    ];
  });

  await Promise.all([
    admin
      .from("course_sessions")
      .update({ status: "cancelled" })
      .eq("id", session.id),
    admin
      .from("enrollments")
      .update({ status: "cancelled" })
      .eq("session_id", session.id)
      .eq("status", "reserved"),
    jobs.length
      ? admin.from("notification_jobs").upsert(jobs, {
          onConflict: "idempotency_key",
          ignoreDuplicates: true,
        })
      : Promise.resolve(),
    admin.from("audit_logs").insert({
      actor_id: actorId,
      action: "session.cancel",
      entity_type: "course_session",
      entity_id: session.id,
    }),
  ]);
  done("/admin/sessions", "場次已取消；已排程通知已付款學員");
}

export async function inviteWaitlistEntry(formData: FormData) {
  const parsed = idSchema.safeParse({ id: formData.get("waitlistId") });
  if (!parsed.success) fail("/admin/sessions", "候補資料不正確");
  const { admin, actorId } = await requireStaff("/admin/sessions");
  const { data: entry } = await admin
    .from("waitlist_entries")
    .select("id, session_id, name, email, phone, status, course_sessions(title)")
    .eq("id", parsed.data.id)
    .eq("status", "waiting")
    .maybeSingle();
  if (!entry) fail("/admin/sessions", "候補已處理或不存在");

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = Array.isArray(entry.course_sessions)
    ? entry.course_sessions[0]
    : entry.course_sessions;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://legendx.hk";
  const payload = {
    email: entry.email,
    phone: entry.phone,
    displayName: entry.name,
    subject: `LegendX 候補有位｜${session?.title ?? "課程場次"}`,
    body: `你的候補場次現有名額，請於 24 小時內前往 ${appUrl}/checkout/1?session=${entry.session_id} 完成報名。`,
  };
  const channels = [
    ...(entry.email ? ["email" as const] : []),
    "whatsapp" as const,
  ];
  await Promise.all([
    admin
      .from("waitlist_entries")
      .update({
        status: "invited",
        invited_at: new Date().toISOString(),
        invitation_expires_at: expiresAt.toISOString(),
      })
      .eq("id", entry.id),
    admin.from("notification_jobs").upsert(
      channels.map((channel) => ({
        channel,
        template_key: "waitlist_invitation",
        payload,
        idempotency_key: `waitlist:${entry.id}:${channel}`,
        scheduled_for: new Date().toISOString(),
      })),
      { onConflict: "idempotency_key", ignoreDuplicates: true },
    ),
    admin.from("audit_logs").insert({
      actor_id: actorId,
      action: "waitlist.invite",
      entity_type: "waitlist_entry",
      entity_id: entry.id,
      after_data: { invitation_expires_at: expiresAt.toISOString() },
    }),
  ]);
  done(
    `/admin/sessions?waitlist=${entry.session_id}`,
    "24 小時候補邀請已排程發送",
  );
}

const reviewSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["publish", "hide"]),
});

export async function moderateReview(formData: FormData) {
  const parsed = reviewSchema.safeParse({
    id: formData.get("reviewId"),
    action: formData.get("action"),
  });
  if (!parsed.success) fail("/admin/reviews", "評價資料不正確");
  const { admin, actorId } = await requireStaff("/admin/reviews");
  const { data: review } = await admin
    .from("reviews")
    .select("rating, consent_public")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!review) fail("/admin/reviews", "評價不存在");
  if (
    parsed.data.action === "publish" &&
    (review.rating < 4 || !review.consent_public)
  ) {
    fail("/admin/reviews", "只可發佈 4 星以上並已同意公開的評價");
  }
  await admin
    .from("reviews")
    .update({
      status: parsed.data.action === "publish" ? "published" : "hidden",
    })
    .eq("id", parsed.data.id);
  await admin.from("audit_logs").insert({
    actor_id: actorId,
    action: `review.${parsed.data.action}`,
    entity_type: "review",
    entity_id: parsed.data.id,
  });
  done("/admin/reviews", "評價狀態已更新");
}

const promoSchema = z.object({
  headline: z.string().trim().min(3).max(160),
  subheadline: z.string().trim().min(3).max(500),
  benefit1: z.string().trim().min(2).max(160),
  benefit2: z.string().trim().min(2).max(160),
  benefit3: z.string().trim().min(2).max(160),
  brandStory: z.string().trim().min(3).max(2000),
});

export async function publishPromo(formData: FormData) {
  const parsed = promoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) fail("/admin/promo", "請填妥推廣頁內容");
  const { admin, actorId } = await requireStaff("/admin/promo");
  const { error } = await admin.rpc("publish_promo_content", {
    p_actor_id: actorId,
    p_headline: parsed.data.headline,
    p_subheadline: parsed.data.subheadline,
    p_benefits: [
      parsed.data.benefit1,
      parsed.data.benefit2,
      parsed.data.benefit3,
    ],
    p_brand_story: parsed.data.brandStory,
  });
  if (error) fail("/admin/promo", "未能發佈推廣頁");
  done("/admin/promo", "新版推廣頁已即時發佈");
}

const settingsSchema = z.object({
  scholarshipDays: z.coerce.number().int().min(1).max(730),
  paymentHoldHours: z.coerce.number().int().min(1).max(168),
});

export async function updateSettings(formData: FormData) {
  const parsed = settingsSchema.safeParse({
    scholarshipDays: formData.get("scholarshipDays"),
    paymentHoldHours: formData.get("paymentHoldHours"),
  });
  if (!parsed.success) fail("/admin/settings", "設定數值超出允許範圍");
  const { admin, actorId } = await requireStaff("/admin/settings");
  const updates = [
    {
      key: "scholarship_validity_days",
      value: parsed.data.scholarshipDays,
      description: "獎學金名額由付款日起計的有效日數",
      updated_by: actorId,
    },
    {
      key: "fps_payment_hold_hours",
      value: parsed.data.paymentHoldHours,
      description: "FPS／現金待確認訂單保留座位時數",
      updated_by: actorId,
    },
  ];
  const { error } = await admin.from("settings").upsert(updates);
  if (error) fail("/admin/settings", "未能儲存設定");
  await admin.from("audit_logs").insert({
    actor_id: actorId,
    action: "settings.update",
    entity_type: "settings",
    after_data: {
      scholarshipDays: parsed.data.scholarshipDays,
      paymentHoldHours: parsed.data.paymentHoldHours,
    },
  });
  done("/admin/settings", "營運設定已儲存並留下審計記錄");
}

const announcementSchema = z.object({
  sessionId: z.string().max(50),
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(3).max(5000),
  channels: z
    .array(z.enum(["in_app", "email", "whatsapp"]))
    .min(1),
});

export async function sendAnnouncement(formData: FormData) {
  const parsed = announcementSchema.safeParse({
    sessionId: formData.get("sessionId"),
    title: formData.get("title"),
    body: formData.get("body"),
    channels: formData.getAll("channels"),
  });
  if (!parsed.success) fail("/admin/announcements", "請填妥公告及發送渠道");
  const { admin, actorId } = await requireStaff("/admin/announcements");
  const sessionId =
    parsed.data.sessionId === "all" ? null : parsed.data.sessionId;
  if (sessionId && !z.string().uuid().safeParse(sessionId).success) {
    fail("/admin/announcements", "場次資料不正確");
  }

  const { data: announcement, error } = await admin
    .from("announcements")
    .insert({
      session_id: sessionId,
      title: parsed.data.title,
      body: parsed.data.body,
      channels: parsed.data.channels,
      created_by: actorId,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !announcement) fail("/admin/announcements", "未能建立公告");

  let memberIds: string[] = [];
  if (sessionId) {
    const { data: enrollments } = await admin
      .from("enrollments")
      .select("member_id")
      .eq("session_id", sessionId)
      .in("status", ["confirmed", "completed"]);
    memberIds = [...new Set((enrollments ?? []).map((item) => item.member_id))];
  }

  let profilesQuery = admin
    .from("profiles")
    .select(
      "id, display_name, email, phone, marketing_email_consent, marketing_whatsapp_consent",
    );
  if (memberIds.length > 0) profilesQuery = profilesQuery.in("id", memberIds);
  if (sessionId && memberIds.length === 0) {
    done("/admin/announcements", "公告已發佈；場次暫時未有收件人");
  }
  const { data: profiles } = await profilesQuery;
  const jobs = (profiles ?? []).flatMap((profile) =>
    parsed.data.channels
      .filter((channel) => channel !== "in_app")
      .filter(
        (channel) =>
          channel !== "whatsapp" ||
          (profile.marketing_whatsapp_consent && profile.phone),
      )
      .filter(
        (channel) =>
          channel !== "email" ||
          Boolean(sessionId) ||
          profile.marketing_email_consent,
      )
      .map((channel) => ({
        member_id: profile.id,
        announcement_id: announcement.id,
        channel,
        template_key: "announcement",
        payload: {
          email: profile.email,
          phone: profile.phone,
          displayName: profile.display_name,
          subject: parsed.data.title,
          body: parsed.data.body,
        },
        idempotency_key: `announcement:${announcement.id}:${profile.id}:${channel}`,
        scheduled_for: new Date().toISOString(),
      })),
  );
  if (jobs.length > 0) {
    await admin.from("notification_jobs").insert(jobs);
  }
  done(
    "/admin/announcements",
    `公告已發佈，${jobs.length} 個外部通知已加入佇列`,
  );
}
