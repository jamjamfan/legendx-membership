import type { CourseStage } from "@/lib/domain/catalog";

export type AppRole = "member" | "staff" | "admin";

export type OrderStatus =
  | "pending_payment"
  | "payment_review"
  | "paid"
  | "refund_requested"
  | "refund_processing"
  | "refunded"
  | "cancelled"
  | "expired";

export type PaymentMethod = "stripe" | "fps" | "cash";

export type EnrollmentStatus =
  | "reserved"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "waitlisted";

export type RebateProgram = "stage_2" | "stage_3";

export type RebateStatus =
  | "pending"
  | "settled"
  | "voided"
  | "reversal_due";

export type InquiryStatus = "new" | "contacted" | "converted" | "closed";

export interface MemberSnapshot {
  id: string;
  displayName: string;
  referralCode: string;
  highestCompletedStage: number;
  referrerId?: string;
}

export interface OrderSnapshot {
  id: string;
  memberId: string;
  stage: CourseStage;
  status: OrderStatus;
}

export interface ReferralBatchSnapshot {
  id: string;
  memberId: string;
  programme: RebateProgram;
  slotsTotal: 2 | 3;
  validFrom: Date;
  expiresAt: Date;
}

export interface RebateSnapshot {
  id: string;
  batchId: string;
  slotIndex: number;
  status: RebateStatus;
  amountCents: number;
}

export interface CheckoutQuote {
  stage: CourseStage;
  coursePriceCents: number;
  membershipFeeCents: number;
  totalCents: number;
  referralApplied: boolean;
}

export interface EnrollmentDecision {
  allowed: boolean;
  reason?:
    | "stage_two_required"
    | "active_order_exists"
    | "invalid_stage"
    | "self_referral";
}
