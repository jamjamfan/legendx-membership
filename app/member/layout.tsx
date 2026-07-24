import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/runtime";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    if (isDemoMode()) return children;
    redirect(
      `/login?error=${encodeURIComponent("會員服務尚未完成設定")}`,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/member");
  }

  return children;
}
