"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { memberRefundsEnabled } from "@/lib/features";
import { isDemoMode } from "@/lib/runtime";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const refundSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().min(5).max(2000),
});

export async function requestRefund(formData: FormData) {
  if (!memberRefundsEnabled) {
    redirect(
      `/member/orders?error=${encodeURIComponent("退款申請功能暫未開放")}`,
    );
  }
  const parsed = refundSchema.safeParse({
    orderId: formData.get("orderId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    redirect(
      `/member/orders?error=${encodeURIComponent("退款原因最少要有 5 個字")}`,
    );
  }

  const server = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!server || !admin) {
    if (isDemoMode()) redirect("/member/orders?success=demo");
    redirect(
      `/member/orders?error=${encodeURIComponent("退款服務暫時未能使用")}`,
    );
  }

  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) redirect("/login?next=/member/orders");

  const { error } = await admin.rpc("request_refund", {
    p_order_id: parsed.data.orderId,
    p_member_id: user.id,
    p_reason: parsed.data.reason,
  });
  if (error) {
    redirect(
      `/member/orders?error=${encodeURIComponent("訂單現時未能申請退款")}`,
    );
  }
  redirect("/member/orders?success=refund_requested");
}

const reviewSchema = z.object({
  sessionId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(3).max(2000),
  consentPublic: z.boolean(),
});

export async function submitReview(formData: FormData) {
  const parsed = reviewSchema.safeParse({
    sessionId: formData.get("sessionId"),
    rating: formData.get("rating"),
    comment: formData.get("comment"),
    consentPublic: formData.get("consentPublic") === "on",
  });
  if (!parsed.success) {
    redirect(
      `/member/reviews?error=${encodeURIComponent("請選擇星級並填寫評語")}`,
    );
  }

  const server = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!server || !admin) {
    if (isDemoMode()) redirect("/member/reviews?success=demo");
    redirect(
      `/member/reviews?error=${encodeURIComponent("評價服務暫時未能使用")}`,
    );
  }

  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) redirect("/login?next=/member/reviews");

  const [{ data: enrollment }, { data: profile }] = await Promise.all([
    admin
      .from("enrollments")
      .select("id")
      .eq("member_id", user.id)
      .eq("session_id", parsed.data.sessionId)
      .eq("status", "completed")
      .maybeSingle(),
    admin
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  if (!enrollment) {
    redirect(
      `/member/reviews?error=${encodeURIComponent("完成課程後先可以提交評價")}`,
    );
  }

  const { error } = await admin.from("reviews").upsert(
    {
      member_id: user.id,
      session_id: parsed.data.sessionId,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      consent_public: parsed.data.consentPublic,
      public_display_name: parsed.data.consentPublic
        ? profile?.display_name
        : null,
      status: "pending",
    },
    { onConflict: "member_id,session_id" },
  );
  if (error) {
    redirect(
      `/member/reviews?error=${encodeURIComponent("未能儲存評價")}`,
    );
  }
  redirect("/member/reviews?success=submitted");
}
