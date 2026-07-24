"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isDemoMode } from "@/lib/runtime";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(10),
  next: z.string().optional(),
});

const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(30),
  email: z.email(),
  password: z.string().min(10).max(128),
  referralCode: z.string().trim().max(20).optional(),
  marketingEmailConsent: z.boolean(),
  marketingWhatsappConsent: z.boolean(),
  stage: z.coerce.number().min(1).max(3).optional(),
});

function safeNextPath(value: string | undefined, fallback: string): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export async function signIn(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    redirect(
      `/login?error=${encodeURIComponent("請檢查電郵同密碼格式")}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    if (!isDemoMode()) {
      redirect(
        `/login?error=${encodeURIComponent("會員服務尚未完成設定")}`,
      );
    }
    const cookieStore = await cookies();
    cookieStore.set("legendx_demo_role", "member", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    redirect(safeNextPath(parsed.data.next, "/member"));
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent("登入資料不正確")}`);
  }

  redirect(safeNextPath(parsed.data.next, "/member"));
}

export async function signInDemo(formData: FormData) {
  if (!isDemoMode()) {
    redirect(
      `/login?error=${encodeURIComponent("正式環境不設示範登入")}`,
    );
  }
  const role = formData.get("role") === "admin" ? "admin" : "member";
  const cookieStore = await cookies();
  cookieStore.set("legendx_demo_role", role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  redirect(role === "admin" ? "/admin" : "/member");
}

export async function signUp(formData: FormData) {
  const parsed = registerSchema.safeParse({
    displayName: formData.get("displayName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    password: formData.get("password"),
    referralCode: formData.get("referralCode") || undefined,
    marketingEmailConsent: formData.get("marketingEmailConsent") === "on",
    marketingWhatsappConsent:
      formData.get("marketingWhatsappConsent") === "on",
    stage: formData.get("stage") || undefined,
  });

  if (!parsed.success) {
    redirect(
      `/register?error=${encodeURIComponent("請檢查必填資料；密碼最少 10 個字元")}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const checkoutPath = parsed.data.stage
    ? `/checkout/${parsed.data.stage}${parsed.data.referralCode ? `?ref=${encodeURIComponent(parsed.data.referralCode)}` : ""}`
    : "/member";

  if (!supabase) {
    if (!isDemoMode()) {
      redirect(
        `/register?error=${encodeURIComponent("會員服務尚未完成設定")}`,
      );
    }
    const cookieStore = await cookies();
    cookieStore.set("legendx_demo_role", "member", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    redirect(checkoutPath);
  }

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback`,
      data: {
        display_name: parsed.data.displayName,
        phone: parsed.data.phone,
        referral_code: parsed.data.referralCode,
        marketing_email_consent: parsed.data.marketingEmailConsent,
        marketing_whatsapp_consent: parsed.data.marketingWhatsappConsent,
      },
    },
  });

  if (error) {
    redirect(`/register?error=${encodeURIComponent("未能建立帳戶，請稍後再試")}`);
  }

  redirect(
    `/login?message=${encodeURIComponent("請先查收驗證電郵，再登入繼續報名")}&next=${encodeURIComponent(checkoutPath)}`,
  );
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  const cookieStore = await cookies();
  cookieStore.delete("legendx_demo_role");
  redirect(`/login?message=${encodeURIComponent("你已安全登出")}`);
}
