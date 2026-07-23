import { useState } from 'react'
import { Bell, CalendarPlus, CheckCircle2, QrCode, Star } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/courses'
import { downloadICS } from '@/lib/ics'
import { checkInPayload, upcomingClasses } from '@/lib/reminders'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

export default function MyCourses() {
  const { db, currentMember, submitReview } = useStore()
  const [passSession, setPassSession] = useState<string | null>(null)
  const [reviewSession, setReviewSession] = useState<string | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  if (!currentMember) return null

  const paidOrders = db.orders.filter(
    (o) => o.memberId === currentMember.id && ['paid', 'refund_review'].includes(o.status) && o.sessionId,
  )
  const classes = upcomingClasses(currentMember, db.orders, db.sessions)
  const passSessionObj = db.sessions.find((s) => s.id === passSession)
  const reviewedSessionIds = new Set(db.reviews.filter((r) => r.memberId === currentMember.id).map((r) => r.sessionId))

  return (
    <div className="space-y-6">
      {/* 下一堂提醒 */}
      {classes.length > 0 && (
        <Card className="gold-border border-2">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                  <Bell className="h-4 w-4" /> 下一堂
                </div>
                <div className="font-display mt-2 text-xl font-bold">{classes[0].session.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {formatDate(classes[0].date)} · {classes[0].session.time} · {classes[0].session.venue}
                </div>
                <div className="mt-2">
                  {classes[0].isToday ? (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">今日上堂！</Badge>
                  ) : classes[0].isTomorrow ? (
                    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">聽日上堂</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">{Math.ceil(classes[0].hoursUntil / 24)} 日後</Badge>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" className="gold-border shrink-0" onClick={() => setPassSession(classes[0].session.id)}>
                <QrCode className="mr-1.5 h-4 w-4" /> 通行證
              </Button>
            </div>
            <div className="mt-4 space-y-1.5 border-t border-border/60 pt-4">
              {classes[0].reminders.map((r) => (
                <div key={r.kind} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Bell className={`h-3 w-3 ${r.due ? 'text-emerald-400' : 'text-muted-foreground/50'}`} />
                  {r.label}：{formatDate(r.at.toISOString())} {String(r.at.getHours()).padStart(2, '0')}:{String(r.at.getMinutes()).padStart(2, '0')}
                  {r.due && <span className="text-emerald-400">（已發送）</span>}
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground/60">正式版會經 Email 同 WhatsApp 自動發送提醒。</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 已報讀場次 */}
      {paidOrders.length === 0 && (
        <Card className="border-border/60"><CardContent className="p-10 text-center text-sm text-muted-foreground">你仲未報讀任何課程。</CardContent></Card>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {paidOrders.map((o) => {
          const session = db.sessions.find((s) => s.id === o.sessionId)
          if (!session) return null
          const attendedDates = new Set(
            db.attendance.filter((a) => a.memberId === currentMember.id && a.sessionId === session.id).map((a) => a.date),
          )
          return (
            <Card key={o.id} className="border-border/60">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{session.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{session.time} · {session.venue}</div>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">已報讀</Badge>
                </div>
                <div className="mt-3 space-y-1.5">
                  {session.dates.map((d, i) => (
                    <div key={d} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">第 {i + 1} 堂 · {formatDate(d)}</span>
                      {attendedDates.has(d) ? (
                        <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="h-3 w-3" /> 已出席</span>
                      ) : (
                        <span className="text-muted-foreground/50">未出席</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gold-border" onClick={() => setPassSession(session.id)}>
                    <QrCode className="mr-1 h-3.5 w-3.5" /> 通行證
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => downloadICS(session, o.courseName)}>
                    <CalendarPlus className="mr-1 h-3.5 w-3.5" /> 行事曆
                  </Button>
                  {!reviewedSessionIds.has(session.id) && (
                    <Button variant="ghost" size="sm" className="flex-1 text-amber-300" onClick={() => { setReviewSession(session.id); setRating(5); setComment('') }}>
                      <Star className="mr-1 h-3.5 w-3.5" /> 評價
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 通行證 QR Dialog */}
      <Dialog open={!!passSession} onOpenChange={() => setPassSession(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader><DialogTitle className="font-display text-center">課堂通行證</DialogTitle></DialogHeader>
          {passSessionObj && (
            <div className="space-y-4">
              <div className="rounded-xl bg-white p-6">
                <QRCodeSVG value={checkInPayload(currentMember.id, passSessionObj.id)} size={220} className="mx-auto" />
              </div>
              <div>
                <div className="font-semibold">{passSessionObj.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{currentMember.name} · 入場時向職員出示此 QR 碼簽到</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 評價 Dialog */}
      <Dialog open={!!reviewSession} onOpenChange={() => setReviewSession(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">評價呢班</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)}>
                  <Star className={`h-7 w-7 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                </button>
              ))}
            </div>
            <Textarea placeholder="分享你嘅上課感受（4 星以上評價會展示喺推廣頁）" value={comment} onChange={(e) => setComment(e.target.value)} rows={4} />
            <Button className="w-full bg-gradient-to-r from-amber-400 to-amber-600 font-bold text-[hsl(222,47%,8%)]" onClick={() => {
              if (!comment.trim()) { toast.error('請寫少少評語'); return }
              const r = submitReview({ sessionId: reviewSession!, rating, comment })
              if (r.ok) { toast.success('多謝你嘅評價！'); setReviewSession(null) }
              else toast.error(r.error ?? '提交失敗')
            }}>提交評價</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
