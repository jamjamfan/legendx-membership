import type {
  InquiryStatus,
  OrderStatus,
  RebateStatus,
} from "@/lib/domain/models";

export const demoMember = {
  id: "demo-member",
  displayName: "陳嘉明",
  email: "member@legendx.hk",
  phone: "9123 4567",
  referralCode: "GOLD8888",
  highestCompletedStage: 2,
  joinedAt: "2026-03-18",
} as const;

export const demoSessions = [
  {
    id: "session-stage-1-aug",
    stage: 1,
    title: "財技 3 班 · 星期五",
    dateLabel: "2026 年 7 月 24、31 日及 8 月 7 日（星期五）",
    timeLabel: "19:00–22:30",
    area: "觀塘",
    venue: "華盛數碼大廈 2303 室",
    instructor: "亞洲第一企業家教練 Yesir 鄭凱名博士 × James Sir",
    capacity: 30,
    enrolled: 17,
    seatsRemaining: 13,
  },
  {
    id: "session-stage-1-sep",
    stage: 1,
    title: "財技 4 班 · 星期三",
    dateLabel: "2026 年 8 月 5、12、19 日（星期三）",
    timeLabel: "19:00–22:30",
    area: "觀塘",
    venue: "華盛數碼大廈 2303 室",
    instructor: "亞洲第一企業家教練 Yesir 鄭凱名博士 × James Sir",
    capacity: 30,
    enrolled: 20,
    seatsRemaining: 10,
  },
  {
    id: "session-stage-2-sep",
    stage: 2,
    title: "第二階段 · 9 月實戰班",
    dateLabel: "2026 年 9 月 20 日起",
    timeLabel: "逢星期日 10:00–18:00",
    area: "港島",
    venue: "LegendX Workshop",
    instructor: "LegendX 導師團隊",
    capacity: 18,
    enrolled: 11,
    seatsRemaining: 7,
  },
] as const;

export const demoOrders: readonly {
  id: string;
  orderNumber: string;
  stage: number;
  course: string;
  session: string;
  amount: number;
  method: string;
  status: OrderStatus;
  createdAt: string;
}[] = [
  {
    id: "order-1003",
    orderNumber: "LX-202607-1003",
    stage: 2,
    course: "第二階段 · 實踐",
    session: "9 月實戰班",
    amount: 6900,
    method: "信用卡",
    status: "paid",
    createdAt: "2026-07-10",
  },
  {
    id: "order-1001",
    orderNumber: "LX-202603-1001",
    stage: 1,
    course: "第一階段 · 財技班",
    session: "財技 2 班",
    amount: 880,
    method: "FPS 轉數快",
    status: "paid",
    createdAt: "2026-03-18",
  },
];

export const demoRebates: readonly {
  id: string;
  friend: string;
  slotIndex: number;
  amount: number;
  status: RebateStatus;
  createdAt: string;
}[] = [
  {
    id: "rebate-1",
    friend: "王小敏",
    slotIndex: 1,
    amount: 1000,
    status: "settled",
    createdAt: "2026-07-18",
  },
  {
    id: "rebate-2",
    friend: "李俊豪",
    slotIndex: 2,
    amount: 2000,
    status: "pending",
    createdAt: "2026-07-22",
  },
];

export const demoInquiries: readonly {
  id: string;
  name: string;
  phone: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
}[] = [
  {
    id: "lead-1",
    name: "張小姐",
    phone: "6111 2233",
    message: "想了解財技 4 班是否尚有名額。",
    status: "new",
    createdAt: "今日 10:42",
  },
  {
    id: "lead-2",
    name: "何先生",
    phone: "9333 8899",
    message: "朋友向我分享了課程，想查詢上課地點。",
    status: "contacted",
    createdAt: "昨日 18:10",
  },
];

export const demoDashboardStats = {
  members: 128,
  orders: 176,
  pendingPayments: 6,
  pendingRefunds: 2,
  pendingRebatesAmount: 16_800,
  sessions: 7,
  inquiries: 14,
} as const;
