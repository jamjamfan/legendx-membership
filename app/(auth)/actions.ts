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

const resendConfirmationSchema = z.object({
  email: z.email(),
  next: z.string().optional(),
});

function safeNextPath(value: string | undefined, fallback: string): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

function authCallbackUrl(next: string): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const callbackUrl = new URL("/auth/callback", appUrl);
  callbackUrl.searchParams.set("next", safeNextPath(next, "/member"));
  return callbackUrl.toString();
}

type AuthAction = "sign-in" | "sign-up" | "resend";

function authErrorMessage(
  action: AuthAction,
  error: { code?: string; status?: number },
): string {
  console.error("Supabase Auth action failed", {
    action,
    code: error.code ?? "unknown",
    status: error.status ?? null,
  });

  if (error.code === "over_email_send_rate_limit" || error.status === 429) {
    return "驗證電郵發送次數已達上限，請一小時後再試；如果帳戶已確認，請直接登入。";
  }

  if (error.code === "email_address_not_authorized") {
    return "目前電郵服務未能寄到呢個地址；請聯絡 LegendX 協助處理。";
  }

  if (error.code === "email_address_invalid") {
    return "呢個電郵地址未能使用，請檢查後再試。";
  }

  if (action === "sign-in" && error.code === "email_not_confirmed") {
    return "呢個帳戶尚未完成電郵驗證，請在下方重新發送驗證電郵。";
  }

  if (
    action === "sign-up" &&
    (error.code === "user_already_exists" || error.code === "email_exists")
  ) {
    return "呢個電郵可能已經有帳戶，請直接登入，唔需要重新開戶。";
  }

  if (action === "sign-in") {
    return "電郵或密碼不正確；如果你已經開過戶口，唔需要再次註冊。";
  }

  if (action === "resend") {
    return "未能重新發送驗證電郵；如果帳戶已確認，請直接登入。";
  }

  return "未能建立帳戶，請稍後再試。";
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
    redirect(
      `/login?error=${encodeURIComponent(authErrorMessage("sign-in", error))}`,
    );
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

export async function signUp(
  lockedReferralCode: string | undefined,
  formData: FormData,
) {
  const parsed = registerSchema.safeParse({
    displayName: formData.get("displayName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    password: formData.get("password"),
    referralCode:
      lockedReferralCode || formData.get("referralCode") || undefined,
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

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: authCallbackUrl(checkoutPath),
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
    redirect(
      `/register?error=${encodeURIComponent(authErrorMessage("sign-up", error))}`,
    );
  }

  if (data.user && data.user.identities?.length === 0) {
    redirect(
      `/login?message=${encodeURIComponent("呢個電郵可能已經有帳戶；請直接登入，已確認帳戶唔會再收到 signup 驗證信。")}&next=${encodeURIComponent(checkoutPath)}`,
    );
  }

  redirect(
    `/login?message=${encodeURIComponent("請先查收驗證電郵，再登入繼續報名")}&next=${encodeURIComponent(checkoutPath)}`,
  );
}

export async function resendConfirmation(formData: FormData) {
  const parsed = resendConfirmationSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    redirect(
      `/login?error=${encodeURIComponent("請輸入正確電郵地址")}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect(
      `/login?error=${encodeURIComponent("會員服務尚未完成設定")}`,
    );
  }

  const next = safeNextPath(parsed.data.next, "/member");
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: {
      emailRedirectTo: authCallbackUrl(next),
    },
  });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(authErrorMessage("resend", error))}&next=${encodeURIComponent(next)}`,
    );
  }

  redirect(
    `/login?message=${encodeURIComponent("如果帳戶仍待驗證，我哋已重新發出驗證電郵；已確認帳戶唔會再收到 signup 信，請直接登入。")}&next=${encodeURIComponent(next)}`,
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
