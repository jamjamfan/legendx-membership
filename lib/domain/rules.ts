import type { CourseStage } from "@/lib/domain/catalog";
import type {
  CheckoutQuote,
  EnrollmentDecision,
  OrderSnapshot,
  PaymentMethod,
  RebateProgram,
  RebateSnapshot,
  ReferralBatchSnapshot,
} from "@/lib/domain/models";

const priceByStage: Record<
  CourseStage,
  {
    basePriceCents: number;
    referralPriceCents?: number;
    membershipFeeCents: number;
  }
> = {
  1: {
    basePriceCents: 98_000,
    referralPriceCents: 88_000,
    membershipFeeCents: 0,
  },
  2: {
    basePriceCents: 680_000,
    membershipFeeCents: 10_000,
  },
  3: {
    basePriceCents: 380_000,
    membershipFeeCents: 0,
  },
};

const rebateSchedule: Record<RebateProgram, readonly number[]> = {
  stage_2: [100_000, 200_000, 380_000],
  stage_3: [100_000, 280_000],
};

const activeOrderStatuses = new Set([
  "pending_payment",
  "payment_review",
  "paid",
  "refund_requested",
  "refund_processing",
]);

export function getCheckoutQuote(
  stage: CourseStage,
  hasValidReferral: boolean,
): CheckoutQuote {
  const pricing = priceByStage[stage];
  const referralApplied =
    stage === 1 && hasValidReferral && pricing.referralPriceCents !== undefined;
  const coursePriceCents = referralApplied
    ? pricing.referralPriceCents!
    : pricing.basePriceCents;

  return {
    stage,
    coursePriceCents,
    membershipFeeCents: pricing.membershipFeeCents,
    totalCents: coursePriceCents + pricing.membershipFeeCents,
    referralApplied,
  };
}

export function canEnroll({
  stage,
  highestCompletedStage,
  orders,
  memberId,
  referrerId,
}: {
  stage: CourseStage;
  highestCompletedStage: number;
  orders: readonly OrderSnapshot[];
  memberId: string;
  referrerId?: string;
}): EnrollmentDecision {
  if (stage < 1 || stage > 3) {
    return { allowed: false, reason: "invalid_stage" };
  }

  if (referrerId && referrerId === memberId) {
    return { allowed: false, reason: "self_referral" };
  }

  if (stage === 3 && highestCompletedStage < 2) {
    return { allowed: false, reason: "stage_two_required" };
  }

  const hasActiveOrder = orders.some(
    (order) =>
      order.memberId === memberId &&
      order.stage === stage &&
      activeOrderStatuses.has(order.status),
  );

  if (hasActiveOrder) {
    return { allowed: false, reason: "active_order_exists" };
  }

  return { allowed: true };
}

export function seatHoldMilliseconds(method: PaymentMethod): number {
  return method === "stripe"
    ? 30 * 60 * 1000
    : 24 * 60 * 60 * 1000;
}

export function rebateAmountCents(
  programme: RebateProgram,
  slotIndex: number,
): number | null {
  return rebateSchedule[programme][slotIndex - 1] ?? null;
}

export interface RebateAllocation {
  batchId: string;
  slotIndex: number;
  amountCents: number;
}

export function allocateRebateSlot({
  batches,
  rebates,
  now,
}: {
  batches: readonly ReferralBatchSnapshot[];
  rebates: readonly RebateSnapshot[];
  now: Date;
}): RebateAllocation | null {
  const eligibleBatches = batches
    .filter(
      (batch) =>
        batch.validFrom.getTime() <= now.getTime() &&
        batch.expiresAt.getTime() > now.getTime(),
    )
    .sort((left, right) => {
      const programmePriority =
        Number(left.programme === "stage_3") -
        Number(right.programme === "stage_3");
      if (programmePriority !== 0) return programmePriority;
      const datePriority = left.validFrom.getTime() - right.validFrom.getTime();
      if (datePriority !== 0) return datePriority;
      return left.id.localeCompare(right.id);
    });

  for (const batch of eligibleBatches) {
    const occupiedSlots = new Set(
      rebates
        .filter(
          (rebate) =>
            rebate.batchId === batch.id && rebate.status !== "voided",
        )
        .map((rebate) => rebate.slotIndex),
    );

    for (let slotIndex = 1; slotIndex <= batch.slotsTotal; slotIndex += 1) {
      if (occupiedSlots.has(slotIndex)) continue;
      const amountCents = rebateAmountCents(batch.programme, slotIndex);
      if (amountCents === null) continue;
      return { batchId: batch.id, slotIndex, amountCents };
    }
  }

  return null;
}

export function refundRebateEffect(rebate: RebateSnapshot):
  | { nextStatus: "voided"; ledgerDeltaCents: number; releasesSlot: true }
  | {
      nextStatus: "reversal_due";
      ledgerDeltaCents: number;
      releasesSlot: false;
    }
  | null {
  if (rebate.status === "voided" || rebate.status === "reversal_due") return null;
  if (rebate.status === "settled") {
    return {
      nextStatus: "reversal_due",
      ledgerDeltaCents: -rebate.amountCents,
      releasesSlot: false,
    };
  }
  return {
    nextStatus: "voided",
    ledgerDeltaCents: -rebate.amountCents,
    releasesSlot: true,
  };
}
