import { describe, expect, it } from "vitest";
import type {
  OrderSnapshot,
  RebateSnapshot,
  ReferralBatchSnapshot,
} from "@/lib/domain/models";
import {
  allocateRebateSlot,
  canEnroll,
  getCheckoutQuote,
  rebateAmountCents,
  refundRebateEffect,
  seatHoldMilliseconds,
} from "@/lib/domain/rules";

describe("checkout pricing", () => {
  it("applies the referral price only to stage one", () => {
    expect(getCheckoutQuote(1, true)).toEqual({
      stage: 1,
      coursePriceCents: 88_000,
      membershipFeeCents: 0,
      totalCents: 88_000,
      referralApplied: true,
    });
    expect(getCheckoutQuote(2, true).totalCents).toBe(690_000);
    expect(getCheckoutQuote(3, true).totalCents).toBe(380_000);
  });

  it("adds the one-off membership fee to stage two", () => {
    expect(getCheckoutQuote(2, false)).toMatchObject({
      coursePriceCents: 680_000,
      membershipFeeCents: 10_000,
      totalCents: 690_000,
    });
  });
});

describe("enrollment eligibility", () => {
  const paidStageOne: OrderSnapshot = {
    id: "order-1",
    memberId: "member-1",
    stage: 1,
    status: "paid",
  };

  it("requires stage two completion before stage three", () => {
    expect(
      canEnroll({
        stage: 3,
        highestCompletedStage: 1,
        orders: [],
        memberId: "member-1",
      }),
    ).toEqual({ allowed: false, reason: "stage_two_required" });
  });

  it("prevents duplicate active stage orders but allows rebooking after refund", () => {
    expect(
      canEnroll({
        stage: 1,
        highestCompletedStage: 0,
        orders: [paidStageOne],
        memberId: "member-1",
      }),
    ).toEqual({ allowed: false, reason: "active_order_exists" });

    expect(
      canEnroll({
        stage: 1,
        highestCompletedStage: 0,
        orders: [{ ...paidStageOne, status: "refunded" }],
        memberId: "member-1",
      }),
    ).toEqual({ allowed: true });
  });

  it("prevents self-referral", () => {
    expect(
      canEnroll({
        stage: 1,
        highestCompletedStage: 0,
        orders: [],
        memberId: "member-1",
        referrerId: "member-1",
      }),
    ).toEqual({ allowed: false, reason: "self_referral" });
  });
});

describe("seat reservations", () => {
  it("holds Stripe checkout for 30 minutes and manual methods for 24 hours", () => {
    expect(seatHoldMilliseconds("stripe")).toBe(30 * 60 * 1000);
    expect(seatHoldMilliseconds("fps")).toBe(24 * 60 * 60 * 1000);
    expect(seatHoldMilliseconds("cash")).toBe(24 * 60 * 60 * 1000);
  });
});

describe("scholarship allocation", () => {
  const now = new Date("2026-07-24T04:00:00.000Z");
  const batches: ReferralBatchSnapshot[] = [
    {
      id: "stage-three",
      memberId: "referrer",
      programme: "stage_3",
      slotsTotal: 2,
      validFrom: new Date("2026-07-01T00:00:00.000Z"),
      expiresAt: new Date("2026-12-28T00:00:00.000Z"),
    },
    {
      id: "stage-two",
      memberId: "referrer",
      programme: "stage_2",
      slotsTotal: 3,
      validFrom: new Date("2026-07-10T00:00:00.000Z"),
      expiresAt: new Date("2027-01-06T00:00:00.000Z"),
    },
  ];

  it("uses stage two slots before stage three slots", () => {
    expect(allocateRebateSlot({ batches, rebates: [], now })).toEqual({
      batchId: "stage-two",
      slotIndex: 1,
      amountCents: 100_000,
    });
  });

  it("uses the first available slot and reuses a voided slot", () => {
    const rebates: RebateSnapshot[] = [
      {
        id: "rebate-1",
        batchId: "stage-two",
        slotIndex: 1,
        amountCents: 100_000,
        status: "voided",
      },
      {
        id: "rebate-2",
        batchId: "stage-two",
        slotIndex: 2,
        amountCents: 200_000,
        status: "settled",
      },
    ];
    expect(allocateRebateSlot({ batches, rebates, now })).toEqual({
      batchId: "stage-two",
      slotIndex: 1,
      amountCents: 100_000,
    });
  });

  it("skips expired batches and returns null when no slot remains", () => {
    const expired = batches.map((batch) => ({
      ...batch,
      expiresAt: new Date("2026-07-20T00:00:00.000Z"),
    }));
    expect(allocateRebateSlot({ batches: expired, rebates: [], now })).toBeNull();
  });

  it("matches the published 3+2 rebate schedule", () => {
    expect([1, 2, 3].map((slot) => rebateAmountCents("stage_2", slot))).toEqual(
      [100_000, 200_000, 380_000],
    );
    expect([1, 2].map((slot) => rebateAmountCents("stage_3", slot))).toEqual([
      100_000,
      280_000,
    ]);
  });
});

describe("refund effects", () => {
  const rebate: RebateSnapshot = {
    id: "rebate",
    batchId: "batch",
    slotIndex: 1,
    status: "pending",
    amountCents: 100_000,
  };

  it("voids pending rebates and releases the slot", () => {
    expect(refundRebateEffect(rebate)).toMatchObject({
      nextStatus: "voided",
      ledgerDeltaCents: -100_000,
      releasesSlot: true,
    });
  });

  it("turns settled rebates into a negative balance without releasing the slot", () => {
    expect(refundRebateEffect({ ...rebate, status: "settled" })).toMatchObject({
      nextStatus: "reversal_due",
      ledgerDeltaCents: -100_000,
      releasesSlot: false,
    });
  });
});
