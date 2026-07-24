import { NextResponse } from "next/server";
import { z } from "zod";
import { createStripeCheckout } from "@/lib/integrations/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  orderId: z.string().uuid(),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  const { data: order } = await admin
    .from("orders")
    .select(
      "id, order_number, member_id, session_id, amount_cents, reserved_until, courses(stage)",
    )
    .eq("id", parsed.data.orderId)
    .eq("member_id", user.id)
    .eq("payment_method", "stripe")
    .eq("status", "pending_payment")
    .maybeSingle();

  if (!order || !order.reserved_until) {
    return NextResponse.json({ error: "payable_order_not_found" }, { status: 404 });
  }

  const course = Array.isArray(order.courses) ? order.courses[0] : order.courses;
  const checkout = await createStripeCheckout({
    id: order.id,
    orderNumber: order.order_number,
    stage: course?.stage ?? 1,
    sessionId: order.session_id,
    amountCents: order.amount_cents,
    customerEmail: user.email ?? "",
    expiresAt: new Date(order.reserved_until),
  });
  await admin
    .from("payments")
    .update({ provider_payment_id: checkout.id })
    .eq("order_id", order.id);

  return NextResponse.json({ checkoutUrl: checkout.url });
}
