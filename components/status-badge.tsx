import type {
  InquiryStatus,
  OrderStatus,
  RebateStatus,
} from "@/lib/domain/models";

const labels: Record<OrderStatus | RebateStatus | InquiryStatus, string> = {
  pending_payment: "待付款",
  payment_review: "待確認",
  paid: "已付款",
  refund_requested: "退款審核中",
  refund_processing: "退款處理中",
  refunded: "已退款",
  cancelled: "已取消",
  expired: "已過期",
  pending: "待結算",
  settled: "已結算",
  voided: "已作廢",
  reversal_due: "待抵扣",
  new: "新查詢",
  contacted: "已聯絡",
  converted: "已轉化",
  closed: "已關閉",
};

const positive = new Set(["paid", "settled", "converted"]);
const warning = new Set([
  "pending_payment",
  "payment_review",
  "refund_requested",
  "refund_processing",
  "pending",
  "new",
  "reversal_due",
]);

export function StatusBadge({
  status,
}: {
  status: OrderStatus | RebateStatus | InquiryStatus;
}) {
  const tone = positive.has(status)
    ? "positive"
    : warning.has(status)
      ? "warning"
      : "neutral";

  return <span className={`status-badge status-${tone}`}>{labels[status]}</span>;
}
