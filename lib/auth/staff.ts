import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getStaffContext(): Promise<{
  actorId: string;
  role: "staff" | "admin";
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>;
} | null> {
  const server = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!server || !admin) return null;

  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !["staff", "admin"].includes(profile.role)) return null;

  return {
    actorId: user.id,
    role: profile.role as "staff" | "admin",
    admin,
  };
}
