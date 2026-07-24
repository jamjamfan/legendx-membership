import Stripe from "stripe";

export interface StripeCheckoutOrder {
  id: string;
  orderNumber: string;
  stage: number;
  sessionId: string;
  amountCents: number;
  customerEmail: string;
  expiresAt: Date;
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET,
  );
}

export function createStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  return secretKey ? new Stripe(secretKey) : null;
}

export async function createStripeCheckout(
  order: StripeCheckoutOrder,
): Promise<{ id: string; url: string }> {
  const stripe = createStripeClient();
  if (!stripe) throw new Error("stripe_not_configured");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("app_url_not_configured");

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: order.customerEmail,
      expires_at: Math.floor(order.expiresAt.getTime() / 1000),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "hkd",
            unit_amount: order.amountCents,
            product_data: {
              name: `LegendX 第 ${order.stage} 階段課程`,
              description: `訂單 ${order.orderNumber}`,
            },
          },
        },
      ],
      metadata: {
        orderId: order.id,
        stage: String(order.stage),
        sessionId: order.sessionId,
      },
      payment_intent_data: {
        metadata: {
          orderId: order.id,
        },
      },
      success_url: `${appUrl}/order/${order.id}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/order/${order.id}?payment=cancelled`,
    },
    {
      idempotencyKey: `checkout:${order.id}`,
    },
  );

  if (!session.url) throw new Error("stripe_checkout_url_missing");
  return { id: session.id, url: session.url };
}
