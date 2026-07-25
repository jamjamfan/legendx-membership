import type { CourseStage } from "@/lib/domain/catalog";
import type { OrderStatus } from "@/lib/domain/models";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const activeRegistrationStatuses: readonly OrderStatus[] = [
  "pending_payment",
  "payment_review",
  "paid",
  "refund_requested",
  "refund_processing",
];

export interface CurrentStageRegistration {
  id: string;
  orderNumber: string;
  status: OrderStatus;
}

export async function getCurrentStageRegistration(
  stage: CourseStage,
): Promise<CurrentStageRegistration | null> {
  const server = await createSupabaseServerClient();
  if (!server) return null;

  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) return null;

  const { data: course, error: courseError } = await server
    .from("courses")
    .select("id")
    .eq("stage", stage)
    .eq("active", true)
    .maybeSingle();

  if (courseError || !course) {
    if (courseError) {
      console.error("Unable to check current stage course", {
        code: courseError.code,
      });
    }
    return null;
  }

  const { data: order, error: orderError } = await server
    .from("orders")
    .select("id, order_number, status")
    .eq("member_id", user.id)
    .eq("course_id", course.id)
    .in("status", [...activeRegistrationStatuses])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (orderError) {
    console.error("Unable to check current stage registration", {
      code: orderError.code,
    });
    return null;
  }
  if (!order) return null;

  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status as OrderStatus,
  };
}
