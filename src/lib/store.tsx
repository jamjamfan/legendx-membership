import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type {
  AttendanceRecord,
  CourseSession,
  CourseStage,
  DB,
  InquiryStatus,
  Member,
  Order,
  PaymentMethod,
  PromoContent,
  RebateRecord,
} from './types'
import { getCourse, priceItems, totalOf, REBATE_SCHEDULE, slotsOf } from './courses'
import { nextClassDate, parseCheckInPayload } from './reminders'
import { supabase, supabaseEnabled } from './supabase'
import { loadAllFromSupabase, syncDiff } from './supabaseSync'

const DB_KEY = 'legendx_db_v4'
const SESSION_KEY = 'legendx_session_v3'
const DAY = 86400000
const iso = (t: number) => new Date(t).toISOString()
const dateStr = (t: number) => new Date(t).toISOString().slice(0, 10)
const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`

function seedDB(): DB {
  const now = Date.now()
  const members: Member[] = [
    { id: 'm_admin', name: '管理員', phone: '90000001', email: 'admin@legendx.hk', password: 'admin1234', referralCode: 'ADMIN001', stage: 0, isAdmin: true, promoViews: 0, createdAt: iso(now - 300 * DAY) },
    { id: 'm_demo', name: '陳大文', phone: '91234567', email: 'demo@legendx.hk', password: 'demo1234', referralCode: 'GOLD8888', stage: 2, promoViews: 47, createdAt: iso(now - 60 * DAY) },
    { id: 'm_may', name: '黃美玲', phone: '92345678', email: 'may@example.com', password: 'demo1234', referralCode: 'MEL2341', referrerId: 'm_demo', referrerCode: 'GOLD8888', stage: 1, promoViews: 3, createdAt: iso(now - 35 * DAY) },
    { id: 'm_keung', name: '李志強', phone: '93456789', email: 'keung@example.com', password: 'demo1234', referralCode: 'LCK7782', referrerId: 'm_demo', referrerCode: 'GOLD8888', stage: 1, promoViews: 0, createdAt: iso(now - 23 * DAY) },
    { id: 'm_kay', name: '張家欣', phone: '94567890', email: 'kay@example.com', password: 'demo1234', referralCode: 'KAY4455', stage: 3, promoViews: 23, createdAt: iso(now - 220 * DAY) },
    { id: 'm_chow', name: '周永恆', phone: '95678901', email: 'chow@example.com', password: 'demo1234', referralCode: 'CHOW1122', stage: 0, promoViews: 0, createdAt: iso(now - 4 * DAY) },
    { id: 'm_wu', name: '吳曉峰', phone: '96789012', email: 'wu@example.com', password: 'demo1234', referralCode: 'WU9900', stage: 1, promoViews: 0, createdAt: iso(now - 16 * DAY) },
    { id: 'm_lam', name: '林嘉穎', phone: '97890123', email: 'lam@example.com', password: 'demo1234', referralCode: 'LAM3321', referrerId: 'm_kay', referrerCode: 'KAY4455', stage: 1, promoViews: 0, createdAt: iso(now - 161 * DAY) },
    { id: 'm_leung', name: '梁俊賢', phone: '98901234', email: 'leung@example.com', password: 'demo1234', referralCode: 'LEUNG88', referrerId: 'm_kay', referrerCode: 'KAY4455', stage: 1, promoViews: 0, createdAt: iso(now - 121 * DAY) },
  ]
  const sessions: CourseSession[] = [
    { id: 's1', stage: 1, title: '財技 3 班（星期五）', dates: ['2026-07-24', '2026-07-31', '2026-08-07'], time: '19:00–22:30', venue: '觀塘鴻圖道 33 號華盛數碼大廈 2303 室（港鐵牛頭角站 A 出口）', instructor: 'Yesir 鄭凱名 × James Sir', capacity: 30 },
    { id: 's2', stage: 1, title: '財技 4 班（星期三）', dates: ['2026-08-05', '2026-08-12', '2026-08-19'], time: '19:00–22:30', venue: '觀塘鴻圖道 33 號華盛數碼大廈 2303 室（港鐵牛頭角站 A 出口）', instructor: 'Yesir 鄭凱名 × James Sir', capacity: 30 },
    { id: 's3', stage: 2, title: '第二階段 · 8月班', dates: [dateStr(now + 1 * DAY), dateStr(now + 8 * DAY), dateStr(now + 15 * DAY), dateStr(now + 22 * DAY)], time: '19:00–23:00', venue: '觀塘鴻圖道 33 號華盛數碼大廈 2303 室', instructor: 'Yesir 鄭凱名 × James Sir', capacity: 20 },
    { id: 's4', stage: 3, title: '第三階段 · 2026 年度計劃', dates: ['2026-09-05'], time: '每月首個星期六 14:00–18:00 ＋ 線上跟進', venue: '觀塘教室（線下＋線上結合）', instructor: 'LegendX 導師團隊', capacity: 15 },
  ]
  const orders: Order[] = [
    { id: 'o1', orderNo: 'LX26061001', memberId: 'm_demo', memberName: '陳大文', stage: 2, courseName: '第二階段 · 進階實戰班', amount: 6900, paymentMethod: 'card', status: 'paid', sessionId: 's3', sessionLabel: '第二階段 · 8月班', createdAt: iso(now - 43 * DAY), paidAt: iso(now - 43 * DAY) },
    { id: 'o2', orderNo: 'LX26062002', memberId: 'm_may', memberName: '黃美玲', stage: 1, courseName: '第一階段 · 財技班', amount: 880, paymentMethod: 'card', status: 'paid', usedReferralCode: 'GOLD8888', referrerMemberId: 'm_demo', sessionId: 's1', sessionLabel: '財技 4 班（星期三）', createdAt: iso(now - 34 * DAY), paidAt: iso(now - 34 * DAY) },
    { id: 'o3', orderNo: 'LX26070203', memberId: 'm_keung', memberName: '李志強', stage: 1, courseName: '第一階段 · 財技班', amount: 880, paymentMethod: 'fps', status: 'paid', usedReferralCode: 'GOLD8888', referrerMemberId: 'm_demo', sessionId: 's1', sessionLabel: '財技 4 班（星期三）', createdAt: iso(now - 22 * DAY), paidAt: iso(now - 21 * DAY) },
    { id: 'o4', orderNo: 'LX26011004', memberId: 'm_kay', memberName: '張家欣', stage: 2, courseName: '第二階段 · 進階實戰班', amount: 6900, paymentMethod: 'card', status: 'paid', createdAt: iso(now - 195 * DAY), paidAt: iso(now - 195 * DAY) },
    { id: 'o5', orderNo: 'LX26060105', memberId: 'm_kay', memberName: '張家欣', stage: 3, courseName: '第三階段 · 一年落地合作計劃', amount: 3800, paymentMethod: 'card', status: 'paid', sessionId: 's4', sessionLabel: '第三階段 · 2026 年度計劃', createdAt: iso(now - 53 * DAY), paidAt: iso(now - 53 * DAY) },
    { id: 'o6', orderNo: 'LX26072106', memberId: 'm_chow', memberName: '周永恆', stage: 1, courseName: '第一階段 · 財技班', amount: 980, paymentMethod: 'fps', status: 'pending', sessionId: 's1', sessionLabel: '財技 4 班（星期三）', createdAt: iso(now - 3 * DAY) },
    { id: 'o7', orderNo: 'LX26071007', memberId: 'm_wu', memberName: '吳曉峰', stage: 1, courseName: '第一階段 · 財技班', amount: 980, paymentMethod: 'card', status: 'refund_review', sessionId: 's1', sessionLabel: '財技 4 班（星期三）', createdAt: iso(now - 14 * DAY), paidAt: iso(now - 14 * DAY), refund: { reason: '工作時間調動，未能配合上課時間', requestedAt: iso(now - 2 * DAY), status: 'reviewing' } },
    { id: 'o8', orderNo: 'LX26021408', memberId: 'm_lam', memberName: '林嘉穎', stage: 1, courseName: '第一階段 · 財技班', amount: 880, paymentMethod: 'card', status: 'paid', usedReferralCode: 'KAY4455', referrerMemberId: 'm_kay', createdAt: iso(now - 160 * DAY), paidAt: iso(now - 160 * DAY) },
    { id: 'o9', orderNo: 'LX26032509', memberId: 'm_leung', memberName: '梁俊賢', stage: 1, courseName: '第一階段 · 財技班', amount: 880, paymentMethod: 'card', status: 'paid', usedReferralCode: 'KAY4455', referrerMemberId: 'm_kay', createdAt: iso(now - 120 * DAY), paidAt: iso(now - 120 * DAY) },
  ]
  const rebates: RebateRecord[] = [
    { id: 'r1', referrerId: 'm_demo', referrerName: '陳大文', referredMemberId: 'm_may', referredName: '黃美玲', orderId: 'o2', program: 2, slotIndex: 1, amount: 1000, status: 'settled', createdAt: iso(now - 34 * DAY), settledAt: iso(now - 30 * DAY) },
    { id: 'r2', referrerId: 'm_demo', referrerName: '陳大文', referredMemberId: 'm_keung', referredName: '李志強', orderId: 'o3', program: 2, slotIndex: 2, amount: 2000, status: 'pending', createdAt: iso(now - 21 * DAY) },
    { id: 'r3', referrerId: 'm_kay', referrerName: '張家欣', referredMemberId: 'm_lam', referredName: '林嘉穎', orderId: 'o8', program: 2, slotIndex: 1, amount: 1000, status: 'settled', createdAt: iso(now - 160 * DAY), settledAt: iso(now - 155 * DAY) },
    { id: 'r4', referrerId: 'm_kay', referrerName: '張家欣', referredMemberId: 'm_leung', referredName: '梁俊賢', orderId: 'o9', program: 2, slotIndex: 2, amount: 2000, status: 'settled', createdAt: iso(now - 120 * DAY), settledAt: iso(now - 115 * DAY) },
  ]
  const promoContent: PromoContent = {
    heroTitle: '學識理財，改寫你嘅財務未來',
    heroSubtitle: '黃金 EA · 房地產 · 財商 —— 線下實戰課程，由三晚基礎班到一年落地陪跑計劃',
    sellingPoints: ['3 晚掌握財商基礎，零經驗都啱', '黃金 EA 實盤演示，唔係齋講理論', '房地產買賣流程逐個步驟拆', '一年落地計劃，導師陪跑實戰'],
    aboutText: 'LegendX 專注實戰財商教育。我哋唔教「發達秘笈」，而係一步步帶你建立正確嘅金錢觀、風險意識同埋可執行嘅投資方法。小班教學，即場發問，真實案例。',
    footerNote: '小班教學 · 名額有限 · 完成第一階段可銜接進階課程',
  }
  return {
    members,
    sessions,
    orders,
    rebates,
    inquiries: [
      { id: 'i1', name: '陳小姐', phone: '91230000', message: '想了解黃金 EA 課程內容', referralCode: 'GOLD8888', referrerId: 'm_demo', status: 'new', createdAt: iso(now - 1 * DAY) },
      { id: 'i2', name: '王先生', phone: '98760000', message: '想知 8 月班仲有冇位', referralCode: 'GOLD8888', referrerId: 'm_demo', status: 'contacted', createdAt: iso(now - 5 * DAY) },
      { id: 'i3', name: '林太', phone: '63330000', referralCode: 'KAY4455', referrerId: 'm_kay', status: 'new', createdAt: iso(now - 2 * DAY) },
    ],
    promoContent,
    settings: { rebateSlotExpiryDays: 180 },
    attendance: [],
    reviews: [
      { id: 'rv1', memberId: 'm_may', memberName: '黃美玲', sessionId: 's1', sessionTitle: '財技 2 班', rating: 5, comment: '三晚學識咗點睇黃金走勢，導師用真實案例教，完全唔係齋講理論。已經報咗第二階段！', createdAt: iso(now - 20 * DAY) },
      { id: 'rv2', memberId: 'm_keung', memberName: '李志強', sessionId: 's1', sessionTitle: '財技 2 班', rating: 5, comment: '本身完全冇投資經驗，上完堂終於明點解要分散配置。小班教學可以即場問問題，好有得着。', createdAt: iso(now - 18 * DAY) },
      { id: 'rv3', memberId: 'm_lam', memberName: '林嘉穎', sessionId: 's1', sessionTitle: '財技 1 班', rating: 4, comment: '內容實用，值回票價。房地產嗰講拆得好好，流程同埋伏位都講晒。', createdAt: iso(now - 100 * DAY) },
    ],
    waitlist: [
      { id: 'w1', sessionId: 's2', name: '陳生', phone: '95550000', status: 'waiting', createdAt: iso(now - 2 * DAY) },
    ],
    announcements: [
      { id: 'a1', sessionId: 's1', sessionLabel: '財技 3 班（星期五）', title: '開課溫馨提示', body: '各位同學，財技 3 班第一堂係 7 月 24 日（星期五）晚上 7 點，地點觀塘鴻圖道 33 號華盛數碼大廈 2303 室（牛頭角站 A 出口），請提早 15 分鐘到場，記得帶備課堂通行證 QR 碼簽到。', createdAt: iso(now - 1 * DAY), sendStatus: 'recorded' },
    ],
  }
}

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw) as DB
  } catch {
    /* fallthrough */
  }
  const seeded = seedDB()
  localStorage.setItem(DB_KEY, JSON.stringify(seeded))
  return seeded
}

interface Result {
  ok: boolean
  error?: string
}

interface PlaceOrderInput {
  stage: CourseStage
  paymentMethod: PaymentMethod
  sessionId?: string
  referralCode?: string
}

interface CheckInResult extends Result {
  already?: boolean
  memberName?: string
  date?: string
}

interface OtpProfileInput {
  name: string
  phone: string
  referralCode?: string
}

interface StoreValue {
  db: DB
  currentMember: Member | null
  /** demo = localStorage 示範模式；cloud = 接咗 Supabase */
  mode: 'demo' | 'cloud'
  /** cloud 模式初次載入中（登入狀態 + 數據未齊） */
  authLoading: boolean
  /** 用介紹碼搵會員（cloud 模式下會包括公眾介紹碼目錄） */
  findMemberByCode: (code?: string) => Member | undefined
  /** 示範模式密碼登入 */
  login: (email: string, password: string) => Result
  /** 示範模式註冊 */
  register: (input: { name: string; phone: string; email: string; password: string; referralCode?: string }) => Result
  /** cloud 模式：發送 email 登入碼 */
  sendLoginCode: (email: string) => Promise<Result>
  /** cloud 模式：驗證登入碼；帶 profile 即係註冊 */
  verifyLoginCode: (email: string, code: string, profile?: OtpProfileInput) => Promise<Result>
  logout: () => void
  placeOrder: (input: PlaceOrderInput) => Result & { orderId?: string }
  confirmPayment: (orderId: string) => void
  requestRefund: (orderId: string, reason: string) => void
  reviewRefund: (orderId: string, approve: boolean, note?: string) => void
  settleRebate: (rebateId: string) => void
  recordPromoView: (code: string) => void
  submitInquiry: (input: { name: string; phone: string; message?: string; referralCode?: string }) => void
  setInquiryStatus: (id: string, status: InquiryStatus) => void
  upsertSession: (s: CourseSession) => void
  deleteSession: (id: string) => void
  updatePromoContent: (p: PromoContent) => void
  setRebateSlotExpiryDays: (days: number) => void
  checkIn: (payload: string) => CheckInResult
  manualCheckIn: (memberId: string, sessionId: string, method?: 'qr' | 'manual') => CheckInResult
  submitReview: (input: { sessionId: string; rating: number; comment: string }) => Result
  joinWaitlist: (input: { sessionId: string; name: string; phone: string }) => void
  promoteWaitlist: (id: string) => void
  sendAnnouncement: (input: { sessionId?: string; title: string; body: string }) => void
  resetDemo: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

/** 付清後嘅連鎖效果：升級會員階段 + 產生介紹人回贈（cloud 模式下數據庫觸發器會做返同樣嘢，本地只係即時反映） */
function afterPaid(db: DB, order: Order): DB {
  let members = db.members.map((m) =>
    m.id === order.memberId ? { ...m, stage: Math.max(m.stage, order.stage) as Member['stage'] } : m,
  )
  let rebates = db.rebates
  if (order.stage === 1 && order.referrerMemberId) {
    const referrer = members.find((m) => m.id === order.referrerMemberId) ?? db.members.find((m) => m.id === order.referrerMemberId)
    if (referrer && !rebates.some((r) => r.orderId === order.id && r.status !== 'voided')) {
      const groups = slotsOf(referrer, db.orders, rebates, db.settings.rebateSlotExpiryDays)
      const group = groups.find((g) => g.remaining > 0)
      if (group) {
        const slotIndex = group.used + 1
        rebates = [
          ...rebates,
          {
            id: uid('r'),
            referrerId: referrer.id,
            referrerName: referrer.name,
            referredMemberId: order.memberId,
            referredName: order.memberName,
            orderId: order.id,
            program: group.program,
            slotIndex,
            amount: REBATE_SCHEDULE[group.program][slotIndex - 1],
            status: 'pending' as const,
            createdAt: new Date().toISOString(),
          },
        ]
      }
    }
  }
  return { ...db, members, rebates }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const mode: 'demo' | 'cloud' = supabaseEnabled ? 'cloud' : 'demo'
  const [db, setDb] = useState<DB>(mode === 'demo' ? loadDB : seedDB)
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem(SESSION_KEY))
  const [cloudUserId, setCloudUserId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(mode === 'cloud')
  const [referrers, setReferrers] = useState<Member[]>([])
  const dbRef = useRef(db)
  dbRef.current = db

  // demo 模式：本地持久化
  useEffect(() => {
    if (mode === 'demo') localStorage.setItem(DB_KEY, JSON.stringify(db))
  }, [db, mode])
  useEffect(() => {
    if (sessionId) localStorage.setItem(SESSION_KEY, sessionId)
    else localStorage.removeItem(SESSION_KEY)
  }, [sessionId])

  /** cloud 模式：由 Supabase 載入數據 + 公眾介紹碼目錄 */
  async function bootstrap(uid_: string | null) {
    if (!supabase) return
    setAuthLoading(true)
    try {
      let loaded = await loadAllFromSupabase(supabase, dbRef.current)
      setDb(loaded)

      // 經 magic link 登入但未曾建 profile（例如冇行 OTP 註冊流程）→ 自動補建
      if (uid_ && !loaded.members.some((m) => m.id === uid_)) {
        const { data: u } = await supabase.auth.getUser()
        const email = u.user?.email ?? ''
        if (email) {
          let newCode = ''
          do {
            newCode = `LX${Math.floor(1000 + Math.random() * 9000)}`
          } while (
            loaded.members.some((m) => m.referralCode === newCode) ||
            referrers.some((m) => m.referralCode === newCode)
          )
          const { error: pErr } = await supabase.from('profiles').upsert({
            id: uid_,
            name: email.split('@')[0],
            phone: '',
            email: email.toLowerCase(),
            referral_code: newCode,
          })
          if (pErr) console.error('[supabase] 自動建立 profile 失敗：', pErr.message)
          else loaded = await loadAllFromSupabase(supabase, dbRef.current)
          setDb(loaded)
        }
      }

      const { data: dir } = await supabase.from('public_profiles').select('*')
      if (dir) {
        setReferrers(
          (dir as { id: string; name: string; referral_code: string }[]).map((r) => ({
            id: r.id,
            name: r.name,
            phone: '',
            email: '',
            password: '',
            referralCode: r.referral_code,
            stage: 0 as const,
            promoViews: 0,
            createdAt: '',
          })),
        )
      }
      setCloudUserId(uid_)
    } finally {
      setAuthLoading(false)
    }
  }

  // cloud 模式：恢復登入狀態 + 監聽變化
  useEffect(() => {
    if (mode !== 'cloud' || !supabase) return
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active) void bootstrap(data.session?.user.id ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid_ = session?.user.id ?? null
      // 登出：即刻清空，唔使重載
      if (!uid_) {
        setCloudUserId(null)
        void bootstrap(null)
        return
      }
      void bootstrap(uid_)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 寫入本地 state；cloud 模式 fire-and-forget 同步上 Supabase */
  function commit(next: DB) {
    const prev = dbRef.current
    setDb(next)
    dbRef.current = next
    if (mode === 'cloud' && supabase) void syncDiff(supabase, prev, next)
  }

  const currentMember =
    mode === 'cloud'
      ? (db.members.find((m) => m.id === cloudUserId) ?? null)
      : (db.members.find((m) => m.id === sessionId) ?? null)

  const findMemberByCode = (code?: string): Member | undefined => {
    const c = code?.trim().toUpperCase()
    if (!c) return undefined
    return db.members.find((m) => m.referralCode === c) ?? referrers.find((m) => m.referralCode === c)
  }

  const value: StoreValue = {
    db,
    currentMember,
    mode,
    authLoading,
    findMemberByCode,

    login(email, password) {
      if (mode === 'cloud') return { ok: false, error: '請用電郵登入碼登入' }
      const m = db.members.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
      if (!m) return { ok: false, error: '搵唔到呢個電郵嘅帳戶' }
      if (m.password !== password) return { ok: false, error: '密碼唔啱，請再試' }
      setSessionId(m.id)
      return { ok: true }
    },

    register(input) {
      if (mode === 'cloud') return { ok: false, error: '請用電郵登入碼註冊' }
      const email = input.email.trim().toLowerCase()
      if (!input.name.trim()) return { ok: false, error: '請填姓名' }
      if (db.members.some((x) => x.email.toLowerCase() === email)) return { ok: false, error: '呢個電郵已經註冊咗' }
      const code = input.referralCode?.trim().toUpperCase()
      let referrer: Member | undefined
      if (code) {
        referrer = db.members.find((x) => x.referralCode === code)
        if (!referrer) return { ok: false, error: '介紹碼無效，請檢查清楚' }
      }
      let newCode = ''
      do {
        newCode = `LX${Math.floor(1000 + Math.random() * 9000)}`
      } while (db.members.some((x) => x.referralCode === newCode))
      const member: Member = {
        id: uid('m'),
        name: input.name.trim(),
        phone: input.phone.trim(),
        email,
        password: input.password,
        referralCode: newCode,
        referrerId: referrer?.id,
        referrerCode: referrer?.referralCode,
        stage: 0,
        promoViews: 0,
        createdAt: new Date().toISOString(),
      }
      commit({ ...db, members: [...db.members, member] })
      setSessionId(member.id)
      return { ok: true }
    },

    async sendLoginCode(email) {
      if (!supabase) return { ok: false, error: '未連接雲端數據庫' }
      const e = email.trim().toLowerCase()
      if (!e) return { ok: false, error: '請填電郵' }
      const { error } = await supabase.auth.signInWithOtp({
        email: e,
        options: { shouldCreateUser: true },
      })
      if (error) {
        console.error('[supabase] 發送登入碼失敗：', error.message)
        return { ok: false, error: '發送失敗，請稍後再試' }
      }
      return { ok: true }
    },

    async verifyLoginCode(email, code, profile) {
      if (!supabase) return { ok: false, error: '未連接雲端數據庫' }
      const e = email.trim().toLowerCase()
      const { data, error } = await supabase.auth.verifyOtp({ email: e, token: code.trim(), type: 'email' })
      if (error || !data.user) {
        console.error('[supabase] 驗證登入碼失敗：', error?.message)
        return { ok: false, error: '登入碼唔啱或已過期，請再試' }
      }
      const userId = data.user.id
      if (profile) {
        // 註冊流程：建立 profile
        if (!profile.name.trim()) return { ok: false, error: '請填姓名' }
        const refCode = profile.referralCode?.trim().toUpperCase()
        const referrer = refCode ? findMemberByCode(refCode) : undefined
        if (refCode && !referrer) return { ok: false, error: '介紹碼無效，請檢查清楚' }
        let newCode = ''
        do {
          newCode = `LX${Math.floor(1000 + Math.random() * 9000)}`
        } while (findMemberByCode(newCode))
        const { error: pErr } = await supabase.from('profiles').upsert({
          id: userId,
          name: profile.name.trim(),
          phone: profile.phone.trim(),
          email: e,
          referral_code: newCode,
          referrer_id: referrer?.id ?? null,
          referrer_code: referrer?.referralCode ?? null,
        })
        if (pErr) {
          console.error('[supabase] 建立 profile 失敗：', pErr.message)
          return { ok: false, error: '建立帳戶失敗，請聯絡職員' }
        }
      }
      await bootstrap(userId)
      return { ok: true }
    },

    logout() {
      if (mode === 'cloud' && supabase) {
        void supabase.auth.signOut()
        setCloudUserId(null)
      } else {
        setSessionId(null)
      }
    },

    placeOrder(input) {
      if (!currentMember) return { ok: false, error: '請先登入' }
      if (input.stage === 3 && currentMember.stage < 2) return { ok: false, error: '需要先完成第二階段先可以升級第三階段' }
      const hasActive = db.orders.some(
        (o) => o.memberId === currentMember.id && o.stage === input.stage && ['pending', 'paid', 'refund_review'].includes(o.status),
      )
      if (hasActive) return { ok: false, error: '你已經有呢個階段嘅有效訂單' }
      const session = input.sessionId ? db.sessions.find((s) => s.id === input.sessionId) : undefined
      if (session) {
        const enrolled = db.orders.filter(
          (o) => o.sessionId === session.id && ['pending', 'paid', 'refund_review'].includes(o.status),
        ).length
        if (enrolled >= session.capacity) return { ok: false, error: '呢班已經滿額，請揀其他場次或加入候補名單' }
      }
      let referrer: Member | undefined
      const code = input.referralCode?.trim().toUpperCase()
      if (input.stage === 1 && code) {
        referrer = findMemberByCode(code)
        if (!referrer) return { ok: false, error: '介紹碼無效' }
        if (referrer.id === currentMember.id) return { ok: false, error: '唔可以用自己嘅介紹碼' }
      }
      const course = getCourse(input.stage)
      const amount = totalOf(priceItems(input.stage, !!referrer))
      const order: Order = {
        id: mode === 'cloud' ? crypto.randomUUID() : uid('o'),
        orderNo: `LX${Date.now().toString().slice(-8)}`,
        memberId: currentMember.id,
        memberName: currentMember.name,
        stage: input.stage,
        courseName: course.name,
        amount,
        paymentMethod: input.paymentMethod,
        status: input.paymentMethod === 'card' ? 'paid' : 'pending',
        usedReferralCode: referrer?.referralCode,
        referrerMemberId: referrer?.id,
        sessionId: session?.id,
        sessionLabel: session?.title,
        createdAt: new Date().toISOString(),
        paidAt: input.paymentMethod === 'card' ? new Date().toISOString() : undefined,
      }
      let next: DB = { ...db, orders: [...db.orders, order] }
      if (order.status === 'paid') next = afterPaid(next, order)
      commit(next)
      return { ok: true, orderId: order.id }
    },

    confirmPayment(orderId) {
      const order = db.orders.find((o) => o.id === orderId)
      if (!order || order.status !== 'pending') return
      const paid: Order = { ...order, status: 'paid', paidAt: new Date().toISOString() }
      const next = afterPaid({ ...db, orders: db.orders.map((o) => (o.id === orderId ? paid : o)) }, paid)
      commit(next)
    },

    requestRefund(orderId, reason) {
      commit({
        ...db,
        orders: db.orders.map((o) =>
          o.id === orderId && o.status === 'paid'
            ? { ...o, status: 'refund_review', refund: { reason, requestedAt: new Date().toISOString(), status: 'reviewing' } }
            : o,
        ),
      })
    },

    reviewRefund(orderId, approve, note) {
      const order = db.orders.find((o) => o.id === orderId)
      if (!order || order.status !== 'refund_review' || !order.refund) return
      const reviewedAt = new Date().toISOString()
      let orders: Order[]
      let rebates = db.rebates
      if (approve) {
        orders = db.orders.map((o) =>
          o.id === orderId
            ? { ...o, status: 'refunded', refund: { ...o.refund!, status: 'approved', adminNote: note, reviewedAt } }
            : o,
        )
        rebates = db.rebates.map((r) => (r.orderId === orderId ? { ...r, status: 'voided' as const } : r))
      } else {
        orders = db.orders.map((o) =>
          o.id === orderId
            ? { ...o, status: 'paid', refund: { ...o.refund!, status: 'rejected', adminNote: note, reviewedAt } }
            : o,
        )
      }
      // 重新計算會員階段
      const memberOrders = orders.filter((o) => o.memberId === order.memberId)
      const stage = Math.max(
        0,
        ...memberOrders.filter((o) => o.status === 'paid' || o.status === 'refund_review').map((o) => o.stage),
      ) as Member['stage']
      const members = db.members.map((m) => (m.id === order.memberId ? { ...m, stage } : m))
      commit({ ...db, orders, rebates, members })
    },

    settleRebate(rebateId) {
      commit({
        ...db,
        rebates: db.rebates.map((r) =>
          r.id === rebateId && r.status === 'pending' ? { ...r, status: 'settled', settledAt: new Date().toISOString() } : r,
        ),
      })
    },

    recordPromoView(code) {
      if (mode === 'cloud' && supabase) {
        // 公眾都可以計數：行 security definer 函數，唔使掂 profiles 表
        void supabase.rpc('increment_promo_view', { code })
        return
      }
      commit({
        ...db,
        members: db.members.map((m) =>
          m.referralCode === code.toUpperCase() ? { ...m, promoViews: m.promoViews + 1 } : m,
        ),
      })
    },

    submitInquiry(input) {
      const code = input.referralCode?.trim().toUpperCase()
      const referrer = code ? findMemberByCode(code) : undefined
      commit({
        ...db,
        inquiries: [
          {
            id: mode === 'cloud' ? crypto.randomUUID() : uid('i'),
            name: input.name.trim(),
            phone: input.phone.trim(),
            message: input.message?.trim(),
            referralCode: referrer?.referralCode,
            referrerId: referrer?.id,
            status: 'new',
            createdAt: new Date().toISOString(),
          },
          ...db.inquiries,
        ],
      })
    },

    setInquiryStatus(id, status) {
      commit({ ...db, inquiries: db.inquiries.map((i) => (i.id === id ? { ...i, status } : i)) })
    },

    upsertSession(s) {
      const exists = db.sessions.some((x) => x.id === s.id)
      commit({
        ...db,
        sessions: exists ? db.sessions.map((x) => (x.id === s.id ? s : x)) : [...db.sessions, s],
      })
    },

    deleteSession(id) {
      commit({ ...db, sessions: db.sessions.filter((s) => s.id !== id) })
    },

    updatePromoContent(p) {
      commit({ ...db, promoContent: p })
    },

    setRebateSlotExpiryDays(days) {
      commit({ ...db, settings: { ...db.settings, rebateSlotExpiryDays: days } })
    },

    checkIn(payload) {
      const parsed = parseCheckInPayload(payload)
      if (!parsed) return { ok: false, error: 'QR 碼格式唔啱' }
      return value.manualCheckIn(parsed.memberId, parsed.sessionId)
    },

    manualCheckIn(memberId, sessionId, method = 'qr') {
      const member = db.members.find((m) => m.id === memberId)
      const session = db.sessions.find((s) => s.id === sessionId)
      if (!member || !session) return { ok: false, error: '搵唔到會員或場次' }
      const enrolled = db.orders.some(
        (o) => o.memberId === memberId && o.sessionId === sessionId && ['paid', 'refund_review'].includes(o.status),
      )
      if (!enrolled) return { ok: false, error: `${member.name} 冇呢個場次嘅已付款訂單` }
      const date = nextClassDate(session)
      if (!date) return { ok: false, error: '場次冇課堂日期' }
      const existing = db.attendance.find(
        (a) => a.memberId === memberId && a.sessionId === sessionId && a.date === date,
      )
      if (existing) return { ok: true, already: true, memberName: member.name, date }
      const record: AttendanceRecord = {
        id: mode === 'cloud' ? crypto.randomUUID() : uid('a'),
        sessionId,
        memberId,
        memberName: member.name,
        date,
        checkedInAt: new Date().toISOString(),
        method,
      }
      commit({ ...db, attendance: [...db.attendance, record] })
      return { ok: true, memberName: member.name, date }
    },

    submitReview(input) {
      if (!currentMember) return { ok: false, error: '請先登入' }
      const session = db.sessions.find((s) => s.id === input.sessionId)
      if (!session) return { ok: false, error: '搵唔到場次' }
      const enrolled = db.orders.some(
        (o) => o.memberId === currentMember.id && o.sessionId === input.sessionId && ['paid', 'refund_review'].includes(o.status),
      )
      if (!enrolled) return { ok: false, error: '你需要係呢班嘅學員先可以評價' }
      if (db.reviews.some((r) => r.memberId === currentMember.id && r.sessionId === input.sessionId))
        return { ok: false, error: '你已經評價過呢班' }
      commit({
        ...db,
        reviews: [
          {
            id: mode === 'cloud' ? crypto.randomUUID() : uid('rv'),
            memberId: currentMember.id,
            memberName: currentMember.name,
            sessionId: session.id,
            sessionTitle: session.title,
            rating: input.rating,
            comment: input.comment.trim(),
            createdAt: new Date().toISOString(),
          },
          ...db.reviews,
        ],
      })
      return { ok: true }
    },

    joinWaitlist(input) {
      commit({
        ...db,
        waitlist: [
          {
            id: mode === 'cloud' ? crypto.randomUUID() : uid('w'),
            sessionId: input.sessionId,
            name: input.name.trim(),
            phone: input.phone.trim(),
            memberId: currentMember?.id,
            status: 'waiting',
            createdAt: new Date().toISOString(),
          },
          ...db.waitlist,
        ],
      })
    },

    promoteWaitlist(id) {
      commit({ ...db, waitlist: db.waitlist.map((w) => (w.id === id ? { ...w, status: 'promoted' as const } : w)) })
    },

    sendAnnouncement(input) {
      const session = input.sessionId ? db.sessions.find((s) => s.id === input.sessionId) : undefined
      commit({
        ...db,
        announcements: [
          {
            id: mode === 'cloud' ? crypto.randomUUID() : uid('an'),
            sessionId: input.sessionId,
            sessionLabel: session?.title ?? '全部學員',
            title: input.title.trim(),
            body: input.body.trim(),
            createdAt: new Date().toISOString(),
            sendStatus: 'recorded',
          },
          ...db.announcements,
        ],
      })
    },

    resetDemo() {
      if (mode === 'cloud') return // 雲端模式唔提供一鍵重置，避免誤刪真實數據
      setDb(seedDB())
      setSessionId(null)
    },
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
