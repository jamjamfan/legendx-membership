export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
}

export async function sendTransactionalEmail(input: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return { delivered: false, reason: "not_configured" as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!response.ok) {
    return {
      delivered: false,
      reason: "provider_error" as const,
      status: response.status,
    };
  }

  const payload = (await response.json()) as { id: string };
  return { delivered: true, providerId: payload.id };
}
