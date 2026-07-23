export type CourseStage = 1 | 2 | 3

export type PaymentMethod = 'card' | 'fps' | 'cash'

export type OrderStatus =
  | 'pending' // 待確認
  | 'paid' // 已付款
  | 'refund_review' // 退款審核中
  | 'refunded' // 已退款

export type RebateStatus = 'pending' | 'settled' | 'voided' // 待結算 / 已結算 / 已作廢

/** 回贈名額所屬計劃：第二階段 3 個名額 / 第三階段 2 個名額 */
export type RebateProgram = 2 | 3

export type InquiryStatus = 'new' | 'contacted' | 'converted' // 新查詢 / 已聯絡 / 已轉化

export interface Course {
  stage: CourseStage
  code: string
  name: string
  tagline: string
  description: string
  format: string
  topics: string[]
  highlights: string[]
  referralSlots: number
  /** 分課大綱（如第一階段三晚內容） */
  lessons?: { title: string; items: string[] }[]
}

export interface Member {
  id: string
  name: string
  phone: string
  email: string
  password: string
  referralCode: string
  referrerId?: string
  referrerCode?: string
  /** 已完成付款的最高階段：0 = 未報讀 */
  stage: 0 | 1 | 2 | 3
  isAdmin?: boolean
  /** 個人推廣頁瀏覽次數 */
  promoViews: number
  createdAt: string
}

export interface RefundRequest {
  reason: string
  requestedAt: string
  status: 'reviewing' | 'approved' | 'rejected'
  adminNote?: string
  reviewedAt?: string
}

export interface Order {
  id: string
  orderNo: string
  memberId: string
  memberName: string
  stage: CourseStage
  courseName: string
  amount: number
  paymentMethod: PaymentMethod
  status: OrderStatus
  usedReferralCode?: string
  referrerMemberId?: string
  sessionId?: string
  sessionLabel?: string
  createdAt: string
  paidAt?: string
  refund?: RefundRequest
}

export interface RebateRecord {
  id: string
  referrerId: string
  referrerName: string
  referredMemberId: string
  referredName: string
  orderId: string
  /** 所屬計劃（第二階段 / 第三階段名額） */
  program: RebateProgram
  /** 第幾個名額（1 起計） */
  slotIndex: number
  amount: number
  status: RebateStatus
  createdAt: string
  settledAt?: string
}

export interface Inquiry {
  id: string
  name: string
  phone: string
  message?: string
  referralCode?: string
  referrerId?: string
  status: InquiryStatus
  createdAt: string
}

export interface CourseSession {
  id: string
  stage: CourseStage
  title: string
  /** 上課日期（ISO 日期字串列表） */
  dates: string[]
  time: string
  venue: string
  instructor: string
  capacity: number
}

export interface PromoContent {
  heroTitle: string
  heroSubtitle: string
  sellingPoints: string[]
  aboutText: string
  footerNote: string
}

export interface AttendanceRecord {
  id: string
  sessionId: string
  memberId: string
  memberName: string
  /** 上課日期（yyyy-mm-dd） */
  date: string
  checkedInAt: string
  method: 'qr' | 'manual'
}

export interface Review {
  id: string
  memberId: string
  memberName: string
  sessionId: string
  sessionTitle: string
  rating: number // 1–5
  comment: string
  createdAt: string
}

export type WaitlistStatus = 'waiting' | 'promoted' | 'cancelled'

export interface WaitlistEntry {
  id: string
  sessionId: string
  name: string
  phone: string
  memberId?: string
  status: WaitlistStatus
  createdAt: string
}

export interface Announcement {
  id: string
  /** undefined = 全部學員 */
  sessionId?: string
  sessionLabel: string
  title: string
  body: string
  createdAt: string
  /** Phase 1 只記錄；Phase 2 先真發送 */
  sendStatus: 'recorded'
}

export interface Settings {
  /** 獎學金名額有效期（日數），由付清該階段日起計 */
  rebateSlotExpiryDays: number
}

export interface DB {
  members: Member[]
  orders: Order[]
  rebates: RebateRecord[]
  inquiries: Inquiry[]
  sessions: CourseSession[]
  promoContent: PromoContent
  settings: Settings
  attendance: AttendanceRecord[]
  reviews: Review[]
  waitlist: WaitlistEntry[]
  announcements: Announcement[]
}

export interface PriceItem {
  label: string
  amount: number
  note?: string
}
