import { type NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const next = request.nextUrl.searchParams.get("next") ?? "/member";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/member";
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    const result = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : tokenHash && type
        ? await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as EmailOtpType,
          })
        : { error: new Error("missing_confirmation_parameters") };

    if (!result.error) {
      return NextResponse.redirect(new URL(safeNext, request.url));
    }
  }

  return NextResponse.redirect(
    new URL(
      `/login?message=${encodeURIComponent("驗證連結可能已經使用或已失效。如果你能夠登入，表示電郵已成功驗證，毋須重新發送；如登入時顯示尚未驗證，系統才會提供重新發送選項。")}`,
      request.url,
    ),
  );
}
