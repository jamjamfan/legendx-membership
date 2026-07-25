import { demoMember } from "@/lib/demo-data";
import { isDemoMode } from "@/lib/runtime";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface CurrentMember {
  id: string;
  displayName: string;
  email: string;
  referralCode: string;
  highestCompletedStage: number;
  live: boolean;
}

export async function getCurrentMember(): Promise<CurrentMember | null> {
  const server = await createSupabaseServerClient();
  if (!server) {
    if (!isDemoMode()) return null;
    return {
      id: demoMember.id,
      displayName: demoMember.displayName,
      email: demoMember.email,
      referralCode: demoMember.referralCode,
      highestCompletedStage: demoMember.highestCompletedStage,
      live: false,
    };
  }

  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) return null;
  const { data: profile } = await server
    .from("profiles")
    .select("id, display_name, email, referral_code, highest_completed_stage")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  return {
    id: profile.id,
    displayName: profile.display_name,
    email: profile.email,
    referralCode: profile.referral_code,
    highestCompletedStage: profile.highest_completed_stage,
    live: true,
  };
}
