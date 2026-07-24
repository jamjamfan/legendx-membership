import { NextResponse } from "next/server";
import { getStaffContext } from "@/lib/auth/staff";

function csvCell(value: unknown): string {
  let text =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function csv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "\uFEFF";
  const columns = Object.keys(rows[0]);
  return `\uFEFF${[
    columns.map(csvCell).join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ].join("\r\n")}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource } = await params;
  const context = await getStaffContext();
  if (!context) {
    return NextResponse.json({ error: "staff_required" }, { status: 403 });
  }

  let rows: Record<string, unknown>[] | null = null;
  if (resource === "members") {
    const { data } = await context.admin
      .from("profiles")
      .select(
        "id, display_name, email, phone, role, referral_code, highest_completed_stage, created_at",
      )
      .order("created_at");
    rows = (data ?? []).map((item) => ({
      member_id: item.id,
      display_name: item.display_name,
      email: item.email,
      phone: item.phone,
      role: item.role,
      referral_code: item.referral_code,
      highest_completed_stage: item.highest_completed_stage,
      joined_at: item.created_at,
    }));
  }

  if (resource === "orders") {
    const { data } = await context.admin
      .from("orders")
      .select(
        "order_number, member_id, amount_cents, currency, payment_method, status, referral_code, paid_at, refunded_at, created_at",
      )
      .order("created_at");
    rows = (data ?? []).map((item) => ({
      order_number: item.order_number,
      member_id: item.member_id,
      amount_hkd: item.amount_cents / 100,
      currency: item.currency,
      payment_method: item.payment_method,
      status: item.status,
      referral_code: item.referral_code,
      paid_at: item.paid_at,
      refunded_at: item.refunded_at,
      created_at: item.created_at,
    }));
  }

  if (resource === "attendance") {
    const { data } = await context.admin
      .from("attendance_records")
      .select(
        "member_id, lesson_id, method, checked_in_by, checked_in_at, note",
      )
      .order("checked_in_at");
    rows = (data ?? []).map((item) => ({ ...item }));
  }

  if (resource === "inquiries") {
    const { data } = await context.admin
      .from("inquiries")
      .select(
        "referrer_id, name, phone, message, status, direct_marketing_consent, last_contacted_at, created_at",
      )
      .order("created_at");
    rows = (data ?? []).map((item) => ({ ...item }));
  }

  if (resource === "rebates") {
    const { data } = await context.admin
      .from("rebate_records")
      .select(
        "referrer_id, referred_member_id, slot_index, amount_cents, status, settled_at, voided_at, created_at",
      )
      .order("created_at");
    rows = (data ?? []).map((item) => ({
      referrer_id: item.referrer_id,
      referred_member_id: item.referred_member_id,
      slot_index: item.slot_index,
      amount_hkd: item.amount_cents / 100,
      status: item.status,
      settled_at: item.settled_at,
      voided_at: item.voided_at,
      created_at: item.created_at,
    }));
  }

  if (!rows) {
    return NextResponse.json({ error: "unsupported_resource" }, { status: 404 });
  }

  return new NextResponse(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="legendx-${resource}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
