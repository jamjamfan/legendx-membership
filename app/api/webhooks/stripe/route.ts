import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");

  if (!secretKey || !webhookSecret || !signature) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const stripe = new Stripe(secretKey);
  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }

  const { error: insertError } = await supabase.from("webhook_events").insert({
    provider: "stripe",
    provider_event_id: event.id,
    event_type: event.type,
    payload: event,
  });

  if (insertError?.code === "23505") {
    return NextResponse.json({ received: true, duplicate: true });
  }
  if (insertError) {
    return NextResponse.json({ error: "event_log_failed" }, { status: 500 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      if (!orderId) throw new Error("missing_order_id");
      if (session.payment_status !== "paid") {
        throw new Error("checkout_not_paid");
      }

      const { error } = await supabase.rpc("complete_paid_order", {
        p_order_id: orderId,
        p_actor_id: null,
      });
      if (error) throw error;

      await supabase
        .from("payments")
        .update({
          status: "succeeded",
          provider_payment_id: session.id,
          provider_metadata: {
            payment_intent: session.payment_intent,
            customer: session.customer,
          },
        })
        .eq("order_id", orderId);
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await Promise.all([
          supabase
            .from("orders")
            .update({ status: "expired" })
            .eq("id", orderId)
            .eq("status", "pending_payment"),
          supabase
            .from("enrollments")
            .update({ status: "cancelled", reserved_until: null })
            .eq("order_id", orderId)
            .eq("status", "reserved"),
          supabase
            .from("payments")
            .update({ status: "failed" })
            .eq("order_id", orderId)
            .eq("status", "pending"),
        ]);
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata.orderId;
      if (orderId) {
        await supabase
          .from("payments")
          .update({
            status: "failed",
            provider_metadata: {
              last_payment_error: paymentIntent.last_payment_error?.message,
            },
          })
          .eq("order_id", orderId);
      }
    }

    await supabase
      .from("webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("provider", "stripe")
      .eq("provider_event_id", event.id);
  } catch (error) {
    await supabase
      .from("webhook_events")
      .update({ error: error instanceof Error ? error.message : "unknown_error" })
      .eq("provider", "stripe")
      .eq("provider_event_id", event.id);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
