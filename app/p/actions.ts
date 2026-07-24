"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isDemoMode } from "@/lib/runtime";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const inquirySchema = z.object({
  code: z.string().trim().min(2).max(20),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(8).max(30),
  message: z.string().trim().max(2000).optional(),
  privacyAccepted: z.literal("on"),
  marketingConsent: z.boolean(),
  website: z.string().max(0).optional(),
});

export async function submitPromoInquiry(formData: FormData) {
  const parsed = inquirySchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    phone: formData.get("phone"),
    message: formData.get("message") || undefined,
    privacyAccepted: formData.get("privacyAccepted"),
    marketingConsent: formData.get("marketingConsent") === "on",
    website: formData.get("website") || undefined,
  });

  const code = String(formData.get("code") ?? "");
  if (!parsed.success) {
    redirect(
      `/p/${encodeURIComponent(code)}?error=${encodeURIComponent("請填妥姓名、電話及私隱確認")}`,
    );
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    if (!isDemoMode()) {
      redirect(
        `/p/${encodeURIComponent(parsed.data.code)}?error=${encodeURIComponent("查詢服務暫時未能使用")}`,
      );
    }
    redirect(`/p/${encodeURIComponent(parsed.data.code)}?success=1#inquiry`);
  }

  const { data: referrer } = await admin
    .from("profiles")
    .select("id")
    .eq("referral_code", parsed.data.code.toUpperCase())
    .maybeSingle();
  if (!referrer) {
    redirect(
      `/p/${encodeURIComponent(parsed.data.code)}?error=${encodeURIComponent("推薦連結已失效")}`,
    );
  }

  const duplicateSince = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recent } = await admin
    .from("inquiries")
    .select("id")
    .eq("referrer_id", referrer.id)
    .eq("phone", parsed.data.phone)
    .gte("created_at", duplicateSince)
    .limit(1)
    .maybeSingle();

  if (!recent) {
    const { data: inquiry, error } = await admin
      .from("inquiries")
      .insert({
        referrer_id: referrer.id,
        name: parsed.data.name,
        phone: parsed.data.phone,
        message: parsed.data.message,
        direct_marketing_consent: parsed.data.marketingConsent,
        consent_recorded_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !inquiry) {
      redirect(
        `/p/${encodeURIComponent(parsed.data.code)}?error=${encodeURIComponent("未能儲存查詢，請稍後再試")}`,
      );
    }
    await admin.from("promo_events").insert({
      referrer_id: referrer.id,
      event_type: "inquiry",
    });
  }

  redirect(`/p/${encodeURIComponent(parsed.data.code)}?success=1#inquiry`);
}
