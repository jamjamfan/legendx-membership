"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { seatHoldMilliseconds } from "@/lib/domain/rules";
import { createStripeCheckout } from "@/lib/integrations/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const checkoutSchema = z.object({
  stage: z.coerce.number().int().min(1).max(3),
  sessionId: z.string().min(1),
  paymentMethod: z.enum(["stripe", "fps", "cash"]),
  referralCode: z.string().trim().max(20).optional(),
});

export async function createCheckoutOrder(formData: FormData) {
  const parsed = checkoutSchema.safeParse({
    stage: formData.get("stage"),
    sessionId: formData.get("sessionId"),
    paymentMethod: formData.get("paymentMethod"),
    referralCode: formData.get("referralCode") || undefined,
  });

  if (!parsed.success) {
    redirect(
      `/checkout/1?error=${encodeURIComponent("請選擇場次同付款方式")}`,
    );
  }

  const stage = parsed.data.stage as 1 | 2 | 3;
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    const query = new URLSearchParams({
      method: parsed.data.paymentMethod,
      stage: String(stage),
      session: parsed.data.sessionId,
    });
    redirect(`/order/LX-DEMO-2401?${query.toString()}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const next = `/checkout/${stage}${parsed.data.referralCode ? `?ref=${encodeURIComponent(parsed.data.referralCode)}` : ""}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    redirect(`/checkout/${stage}?error=${encodeURIComponent("付款服務尚未完成設定")}`);
  }

  const { data: course } = await admin
    .from("courses")
    .select(
      "id, stage, base_price_cents, referral_price_cents, membership_fee_cents",
    )
    .eq("stage", stage)
    .eq("active", true)
    .maybeSingle();

  if (!course) {
    redirect(`/checkout/${stage}?error=${encodeURIComponent("課程暫時未能報名")}`);
  }

  const [{ data: session }, { data: referrer }] = await Promise.all([
    admin
      .from("course_sessions")
      .select("id")
      .eq("id", parsed.data.sessionId)
      .eq("course_id", course.id)
      .in("status", ["published", "full"])
      .maybeSingle(),
    parsed.data.referralCode
      ? admin
          .from("profiles")
          .select("id, referral_code")
          .eq("referral_code", parsed.data.referralCode.toUpperCase())
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!session) {
    redirect(`/checkout/${stage}?error=${encodeURIComponent("所選場次已停止報名")}`);
  }
  if (referrer?.id === user.id) {
    redirect(`/checkout/${stage}?error=${encodeURIComponent("唔可以使用自己嘅介紹碼")}`);
  }

  const referralApplied =
    stage === 1 && Boolean(referrer) && course.referral_price_cents !== null;
  const amountCents =
    (referralApplied
      ? course.referral_price_cents!
      : course.base_price_cents) + course.membership_fee_cents;
  const holdMs = seatHoldMilliseconds(parsed.data.paymentMethod);
  const expiresAt = new Date(Date.now() + holdMs);

  const { data: rawOrder, error } = await admin
    .rpc("create_checkout_order", {
      p_member_id: user.id,
      p_course_id: course.id,
      p_session_id: session.id,
      p_payment_method: parsed.data.paymentMethod,
      p_amount_cents: amountCents,
      p_referral_code: referralApplied ? referrer?.referral_code : null,
      p_referrer_id: referralApplied ? referrer?.id : null,
      p_reserved_until: expiresAt.toISOString(),
    })
    .single();
  const order = rawOrder as
    | { id: string; order_number: string }
    | null;

  if (error || !order) {
    const reason =
      error?.message.includes("session_full")
        ? "場次已滿，請加入候補"
        : error?.message.includes("stage_two_required")
          ? "完成第二階段後先可以報讀第三階段"
          : error?.message.includes("active_order_exists")
            ? "你已有同階段有效訂單"
            : "未能建立訂單，請稍後再試";
    redirect(`/checkout/${stage}?error=${encodeURIComponent(reason)}`);
  }

  if (parsed.data.paymentMethod === "stripe") {
    let checkoutUrl: string;
    try {
      const checkout = await createStripeCheckout({
        id: order.id,
        orderNumber: order.order_number,
        stage,
        sessionId: session.id,
        amountCents,
        customerEmail: user.email ?? "",
        expiresAt,
      });
      await admin
        .from("payments")
        .update({ provider_payment_id: checkout.id })
        .eq("order_id", order.id);
      checkoutUrl = checkout.url;
    } catch (stripeError) {
      if (
        stripeError instanceof Error &&
        stripeError.message === "stripe_not_configured" &&
        process.env.NODE_ENV !== "production"
      ) {
        redirect(`/order/${order.id}?method=stripe-demo`);
      }
      redirect(`/order/${order.id}?error=${encodeURIComponent("未能開啟信用卡付款，座位仍為你保留")}`);
    }
    redirect(checkoutUrl);
  }

  redirect(`/order/${order.id}?method=${parsed.data.paymentMethod}`);
}
