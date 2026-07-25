"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isDemoMode } from "@/lib/runtime";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  orderId: z.string().uuid(),
});

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["application/pdf", "pdf"],
]);

export async function uploadPaymentProof(formData: FormData) {
  const parsed = schema.safeParse({ orderId: formData.get("orderId") });
  const file = formData.get("proof");
  if (
    !parsed.success ||
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > 5 * 1024 * 1024 ||
    !allowedTypes.has(file.type)
  ) {
    redirect(
      `/member/orders?error=${encodeURIComponent("請上載 5MB 以下 JPG、PNG 或 PDF")}`,
    );
  }

  const server = await createSupabaseServerClient();
  if (!server) {
    if (isDemoMode()) redirect(`/order/${parsed.data.orderId}?proof=demo`);
    redirect(
      `/order/${parsed.data.orderId}?error=${encodeURIComponent("付款證明服務暫時未能使用")}`,
    );
  }

  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) redirect(`/login?next=/order/${parsed.data.orderId}`);

  const { data: order } = await server
    .from("orders")
    .select("id")
    .eq("id", parsed.data.orderId)
    .eq("member_id", user.id)
    .eq("payment_method", "fps")
    .eq("status", "payment_review")
    .maybeSingle();
  if (!order) {
    redirect(
      `/order/${parsed.data.orderId}?error=${encodeURIComponent("訂單現時唔需要付款證明")}`,
    );
  }

  const extension = allowedTypes.get(file.type)!;
  const path = `${user.id}/${order.id}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await server.storage
    .from("payment-proofs")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    redirect(
      `/order/${order.id}?error=${encodeURIComponent("未能上載付款證明，請稍後再試")}`,
    );
  }

  const { error: updateError } = await server.rpc("record_payment_proof", {
    p_order_id: order.id,
    p_proof_path: path,
  });
  if (updateError) {
    redirect(
      `/order/${order.id}?error=${encodeURIComponent("付款證明已上載，但未能連結訂單")}`,
    );
  }
  redirect(`/order/${order.id}?proof=uploaded`);
}
