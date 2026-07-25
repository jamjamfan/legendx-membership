"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createStripeCheckout } from "@/lib/integrations/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const checkoutSchema = z.object({
  stage: z.coerce.number().int().min(1).max(3),
  sessionId: z.string().min(1),
  paymentMethod: z.enum(["stripe", "fps", "cash"]),
  referralCode: z.string().trim().max(20).optional(),
});

export async function createCheckoutOrder(
  lockedReferralCode: string | undefined,
  formData: FormData,
) {
  const parsed = checkoutSchema.safeParse({
    stage: formData.get("stage"),
    sessionId: formData.get("sessionId"),
    paymentMethod: formData.get("paymentMethod"),
    referralCode:
      lockedReferralCode || formData.get("referralCode") || undefined,
  });

  if (!parsed.success) {
    const submittedStage = Number(formData.get("stage"));
    const fallbackStage = [1, 2, 3].includes(submittedStage)
      ? submittedStage
      : 1;
    redirect(
      `/checkout/${fallbackStage}?error=${encodeURIComponent("請選擇場次同付款方式")}`,
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

  const { data: rawOrder, error } = await supabase
    .rpc("create_checkout_order_for_current_user", {
      p_stage: stage,
      p_session_id: parsed.data.sessionId,
      p_payment_method: parsed.data.paymentMethod,
      p_referral_code: parsed.data.referralCode ?? null,
    })
    .single();
  const order = rawOrder as
    | {
        id: string;
        order_number: string;
        amount_cents: number;
        reserved_until: string;
      }
    | null;

  if (error || !order) {
    console.error("Unable to create checkout order", {
      code: error?.code ?? "missing_order",
    });
    const reason =
      error?.message.includes("session_full")
        ? "場次已滿，請加入候補"
        : error?.message.includes("enrollment_closed")
          ? "所選場次已停止報名"
          : error?.message.includes("invalid_referral")
            ? "介紹碼無效，請檢查後再試"
            : error?.message.includes("self_referral")
              ? "唔可以使用自己嘅介紹碼"
              : error?.message.includes("stage_two_required")
                ? "完成第二階段後先可以報讀第三階段"
                : error?.message.includes("active_order_exists") ||
                    error?.code === "23505"
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
        sessionId: parsed.data.sessionId,
        amountCents: order.amount_cents,
        customerEmail: user.email ?? "",
        expiresAt: new Date(order.reserved_until),
      });
      checkoutUrl = checkout.url;
    } catch (stripeError) {
      if (
        stripeError instanceof Error &&
        stripeError.message === "stripe_not_configured" &&
        process.env.NODE_ENV !== "production"
      ) {
        redirect(`/order/${order.id}?method=stripe-demo`);
      }
      redirect(
        `/order/${order.id}?error=${encodeURIComponent("未能開啟信用卡付款，座位仍為你保留")}`,
      );
    }
    redirect(checkoutUrl);
  }

  redirect(`/order/${order.id}?method=${parsed.data.paymentMethod}`);
}
