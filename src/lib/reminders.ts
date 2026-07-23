import type { CourseSession, Member, Order } from './types'

/** 由場次時間字串（如「19:00–22:30」）攞開始時間 */
export function sessionStartTime(session: CourseSession): string {
  const m = session.time.match(/\d{1,2}:\d{2}/)
  return m ? m[0].padStart(5, '0') : '19:00'
}

/** 某堂嘅實際開始 Date */
export function classStart(session: CourseSession, date: string): Date {
  return new Date(`${date}T${sessionStartTime(session)}:00`)
}

/** 場次嘅下一堂（今日或之後嘅第一堂；冇就最後一堂） */
export function nextClassDate(session: CourseSession, from = new Date()): string | undefined {
  const today = from.toISOString().slice(0, 10)
  return session.dates.find((d) => d >= today) ?? session.dates[session.dates.length - 1]
}

export interface ClassReminder {
  /** 提醒類型 */
  kind: 'day_before' | 'hours_before'
  label: string
  /** 應發送時間 */
  at: Date
  /** 而家是否已經過咗發送時間（示範用） */
  due: boolean
}

export interface UpcomingClass {
  session: CourseSession
  date: string
  startsAt: Date
  /** 距離而家幾多小時 */
  hoursUntil: number
  isToday: boolean
  isTomorrow: boolean
  reminders: ClassReminder[]
}

/** 會員已報讀（已付費）場次嘅未來課堂，含 T-1日 / T-3小時 提醒時間表 */
export function upcomingClasses(member: Member, orders: Order[], sessions: CourseSession[]): UpcomingClass[] {
  const paidOrders = orders.filter(
    (o) => o.memberId === member.id && (o.status === 'paid' || o.status === 'refund_review') && o.sessionId,
  )
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const result: UpcomingClass[] = []
  for (const order of paidOrders) {
    const session = sessions.find((s) => s.id === order.sessionId)
    if (!session) continue
    for (const date of session.dates) {
      if (date < today) continue
      const startsAt = classStart(session, date)
      if (startsAt.getTime() < now.getTime() - 4 * 3600000) continue // 已開始超過 4 小時視為已完結
      const hoursUntil = (startsAt.getTime() - now.getTime()) / 3600000
      const dayBefore = new Date(startsAt.getTime() - 24 * 3600000)
      const hoursBefore = new Date(startsAt.getTime() - 3 * 3600000)
      result.push({
        session,
        date,
        startsAt,
        hoursUntil,
        isToday: date === today,
        isTomorrow: date === new Date(now.getTime() + 86400000).toISOString().slice(0, 10),
        reminders: [
          { kind: 'day_before', label: '開課前 1 日提醒', at: dayBefore, due: dayBefore <= now },
          { kind: 'hours_before', label: '開課前 3 小時提醒', at: hoursBefore, due: hoursBefore <= now },
        ],
      })
    }
  }
  return result.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
}

/** QR 課堂通行證內容 */
export function checkInPayload(memberId: string, sessionId: string): string {
  return `LXCHECKIN|${memberId}|${sessionId}`
}

export function parseCheckInPayload(raw: string): { memberId: string; sessionId: string } | null {
  const parts = raw.trim().split('|')
  if (parts.length === 3 && parts[0] === 'LXCHECKIN' && parts[1] && parts[2]) {
    return { memberId: parts[1], sessionId: parts[2] }
  }
  return null
}
