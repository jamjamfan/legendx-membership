import type {
  Course,
  CourseStage,
  Member,
  Order,
  OrderStatus,
  PaymentMethod,
  PriceItem,
  RebateProgram,
  RebateRecord,
  RebateStatus,
} from './types'

export const COURSES: Course[] = [
  {
    stage: 1,
    code: 'LX-101',
    name: '第一階段 · 財商基礎班',
    tagline: '三個晚上，建立正確嘅金錢觀同治富思維',
    description:
      '由零開始認識財商：點解啲人愈理愈有錢、黃金 EA 自動交易入門、房地產基本概念。適合完全冇投資經驗嘅朋友。',
    format: '線下課堂 · 3 晚 × 3.5 小時',
    topics: ['財商思維', '黃金 EA 入門', '房地產基礎'],
    highlights: ['小班教學，即場發問', '真實案例拆解', '完成後可銜接第二階段'],
    referralSlots: 0,
  },
  {
    stage: 2,
    code: 'LX-201',
    name: '第二階段 · 進階實戰班',
    tagline: '四晚實戰，學識落地操作同風險管理',
    description:
      '深入黃金 EA 實戰設定、房地產買賣流程與估值、資產配置實務。完成後即成為 LegendX 會員，獲 3 個介紹朋友獎學金名額。',
    format: '線下課堂 · 4 晚 × 4 小時',
    topics: ['黃金 EA 實戰', '房地產實務', '資產配置'],
    highlights: ['實盤演示', '導師一對一答問', '送 3 個介紹獎學金名額（最高回贈 HK$6,800）'],
    referralSlots: 3,
  },
  {
    stage: 3,
    code: 'LX-301',
    name: '第三階段 · 一年落地合作計劃',
    tagline: '一年同行，由學識到真正落地賺到',
    description:
      '為第二階段畢業學員而設嘅一年合作計劃：線下 + 線上結合，持續跟進你嘅投資組合，實戰陪跑一年。報名即獲 2 個介紹朋友獎學金名額。',
    format: '一年計劃 · 線下 + 線上結合',
    topics: ['投資組合陪跑', '進階黃金 EA', '房地產項目實戰'],
    highlights: ['一年持續跟進', '線上線下結合', '送 2 個介紹獎學金名額（最高回贈 HK$3,800）'],
    referralSlots: 2,
  },
]

export function getCourse(stage: CourseStage): Course {
  return COURSES.find((c) => c.stage === stage)!
}

/** 介紹獎學金回贈表：第 N 個朋友報讀第一階段，介紹人回贈金額 */
export const REBATE_SCHEDULE: Record<RebateProgram, number[]> = {
  2: [1000, 2000, 3800],
  3: [1000, 2800],
}

export const STAGE1_PUBLIC_PRICE = 980
export const STAGE1_REFERRAL_PRICE = 880
export const STAGE2_TUITION = 6800
export const STAGE2_MEMBERSHIP_FEE = 100
export const STAGE3_PRICE = 3800

export function priceItems(stage: CourseStage, hasReferral: boolean): PriceItem[] {
  if (stage === 1) {
    return hasReferral
      ? [{ label: '第一階段課程費（介紹優惠價）', amount: STAGE1_REFERRAL_PRICE, note: '原價 HK$980' }]
      : [{ label: '第一階段課程費', amount: STAGE1_PUBLIC_PRICE }]
  }
  if (stage === 2) {
    return [
      { label: '第二階段課程費', amount: STAGE2_TUITION },
      { label: '會員費', amount: STAGE2_MEMBERSHIP_FEE, note: '一次性' },
    ]
  }
  return [{ label: '第三階段升級費用', amount: STAGE3_PRICE, note: '一年落地合作計劃' }]
}

export function totalOf(items: PriceItem[]): number {
  return items.reduce((s, i) => s + i.amount, 0)
}

/** 會員目前擁有嘅回贈名額計劃（按已付費最高階段） */
export function programsOf(member: Member): RebateProgram[] {
  const programs: RebateProgram[] = []
  if (member.stage >= 2) programs.push(2)
  if (member.stage >= 3) programs.push(3)
  return programs
}

/** 會員喺某計劃已用咗幾多個名額（voided 唔計，名額會釋放返） */
export function usedSlots(rebates: RebateRecord[], referrerId: string, program: RebateProgram): number {
  return rebates.filter((r) => r.referrerId === referrerId && r.program === program && r.status !== 'voided')
    .length
}

export interface ProgramSlots {
  program: RebateProgram
  total: number
  used: number
  remaining: number
  /** 名額由邊張訂單產生（付清日） */
  grantedAt?: string
  expiresAt?: string
  daysLeft?: number
  expired: boolean
}

/** 計算會員各計劃嘅名額狀態（含有效期） */
export function slotsOf(
  member: Member,
  orders: Order[],
  rebates: RebateRecord[],
  expiryDays: number,
): ProgramSlots[] {
  const paidOrders = orders.filter(
    (o) => o.memberId === member.id && (o.status === 'paid' || o.status === 'refund_review'),
  )
  const result: ProgramSlots[] = []
  const grants: { program: RebateProgram; stage: CourseStage }[] = [
    { program: 2, stage: 2 },
    { program: 3, stage: 3 },
  ]
  for (const g of grants) {
    const order = paidOrders
      .filter((o) => o.stage === g.stage && o.paidAt)
      .sort((a, b) => (a.paidAt! < b.paidAt! ? -1 : 1))[0]
    if (!order) continue
    const total = REBATE_SCHEDULE[g.program].length
    const used = usedSlots(rebates, member.id, g.program)
    const expires = new Date(order.paidAt!)
    expires.setDate(expires.getDate() + expiryDays)
    const daysLeft = Math.ceil((expires.getTime() - Date.now()) / 86400000)
    const expired = daysLeft < 0
    result.push({
      program: g.program,
      total,
      used,
      remaining: expired ? 0 : total - used,
      grantedAt: order.paidAt,
      expiresAt: expires.toISOString(),
      daysLeft,
      expired,
    })
  }
  return result
}

export function formatHKD(amount: number): string {
  return `HK$${amount.toLocaleString('en-HK')}`
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: '待確認',
  paid: '已付款',
  refund_review: '退款審核中',
  refunded: '已退款',
}

export const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  paid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  refund_review: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  refunded: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  card: '信用卡',
  fps: 'FPS 轉數快',
  cash: '人工收款',
}

export const REBATE_STATUS_LABEL: Record<RebateStatus, string> = {
  pending: '待結算',
  settled: '已結算',
  voided: '已作廢',
}

export const REBATE_STATUS_CLASS: Record<RebateStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  settled: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  voided: 'bg-slate-500/15 text-slate-500 border-slate-500/30 line-through',
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function stageLabel(stage: number): string {
  if (stage === 0) return '未報讀'
  return `第${['一', '二', '三'][stage - 1]}階段`
}
