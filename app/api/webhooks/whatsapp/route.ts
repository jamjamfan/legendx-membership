import { NextResponse } from "next/server";
import { hasValidSha256Signature } from "@/lib/security/secrets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    token === process.env.META_WHATSAPP_VERIFY_TOKEN
  ) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (
    !hasValidSha256Signature(
      rawBody,
      request.headers.get("x-hub-signature-256"),
      process.env.META_APP_SECRET,
    )
  ) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          statuses?: Array<{
            id: string;
            status: string;
            timestamp?: string;
            errors?: unknown;
          }>;
        };
      }>;
    }>;
  };
  const statuses =
    payload.entry?.flatMap(
      (entry) =>
        entry.changes?.flatMap((change) => change.value?.statuses ?? []) ?? [],
    ) ?? [];
  const admin = createSupabaseAdminClient();

  if (admin && statuses.length > 0) {
    await Promise.all(
      statuses.map(async (status) => {
        const eventId = [
          status.id,
          status.status,
          status.timestamp ?? "unknown",
        ].join(":");
        await admin.from("webhook_events").upsert(
          {
            provider: "whatsapp",
            provider_event_id: eventId,
            event_type: `message.${status.status}`,
            payload: status,
            processed_at: new Date().toISOString(),
          },
          { onConflict: "provider,provider_event_id", ignoreDuplicates: true },
        );

        if (["failed", "undelivered"].includes(status.status)) {
          await admin
            .from("notification_jobs")
            .update({
              status: "failed",
              last_error: JSON.stringify(status.errors ?? status.status).slice(
                0,
                500,
              ),
            })
            .eq("provider_message_id", status.id);
        }
      }),
    );
  }

  return NextResponse.json({ received: true, statuses: statuses.length });
}
