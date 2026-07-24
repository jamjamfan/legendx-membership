"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isDemoMode } from "@/lib/runtime";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const waitlistSchema = z.object({
  session: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(8).max(30),
  email: z.email().optional().or(z.literal("")),
  website: z.string().max(0).optional(),
});

export async function joinWaitlist(formData: FormData) {
  const parsed = waitlistSchema.safeParse({
    session: formData.get("session"),
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    website: formData.get("website") || undefined,
  });

  if (!parsed.success) {
    redirect(
      `/waitlist?session=${encodeURIComponent(String(formData.get("session") ?? ""))}&error=${encodeURIComponent("請填妥候補資料")}`,
    );
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    if (!isDemoMode()) {
      redirect(
        `/waitlist?session=${encodeURIComponent(parsed.data.session)}&error=${encodeURIComponent("候補服務暫時未能使用")}`,
      );
    }
    redirect(
      `/waitlist?session=${encodeURIComponent(parsed.data.session)}&success=1`,
    );
  }

  const { data: session } = await admin
    .from("course_sessions")
    .select("id")
    .eq("id", parsed.data.session)
    .in("status", ["published", "full"])
    .maybeSingle();
  if (!session) {
    redirect(
      `/waitlist?session=${encodeURIComponent(parsed.data.session)}&error=${encodeURIComponent("場次已停止候補")}`,
    );
  }

  const { data: existing } = await admin
    .from("waitlist_entries")
    .select("id")
    .eq("session_id", session.id)
    .eq("phone", parsed.data.phone)
    .in("status", ["waiting", "invited"])
    .limit(1)
    .maybeSingle();

  if (!existing) {
    const { error } = await admin.from("waitlist_entries").insert({
      session_id: session.id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
    });
    if (error) {
      redirect(
        `/waitlist?session=${encodeURIComponent(parsed.data.session)}&error=${encodeURIComponent("未能加入候補，請稍後再試")}`,
      );
    }
  }

  redirect(
    `/waitlist?session=${encodeURIComponent(parsed.data.session)}&success=1`,
  );
}
