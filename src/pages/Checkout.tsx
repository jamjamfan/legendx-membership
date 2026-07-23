import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Banknote, CalendarDays, CreditCard, Smartphone, Users } from 'lucide-react'
import { toast } from 'sonner'
import { formatHKD, getCourse, priceItems, totalOf } from '@/lib/courses'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import type { CourseStage, PaymentMethod } from '@/lib/types'

export default function Checkout() {
  const { stage: stageParam } = useParams()
  const navigate = useNavigate()
  const { db, currentMember, placeOrder, joinWaitlist } = useStore()
  const stage = Number(stageParam) as CourseStage
  const course = getCourse(stage)

  const sessions = db.sessions.filter((s) => s.stage === stage)
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? '')
  const [referralCode, setReferralCode] = useState(currentMember?.referrerCode ?? '')
  const [method, setMethod] = useState<PaymentMethod>('card')
  const [error, setError] = useState('')
  const [waitlistName, setWaitlistName] = useState(currentMember?.name ?? '')
  const [waitlistPhone, setWaitlistPhone] = useState(currentMember?.phone ?? '')
  const [waitlistJoined, setWaitlistJoined] = useState(false)

  // 信用卡示範欄位
  const [cardNo, setCardNo] = useState('')
  const [cardExp, setCardExp] = useState('')
  const [cardCvc, setCardCvc] = useState('')

  const validReferral = useMemo(() => {
    const code = referralCode.trim().toUpperCase()
    if (!code || stage !== 1) return undefined
    const m = db.members.find((x) => x.referralCode === code)
    if (!m || m.id === currentMember?.id) return undefined
    return m
  }, [referralCode, stage, db.members, currentMember])

  const items = priceItems(stage, !!validReferral)
  const total = totalOf(items)

  const enrolledOf = (id: string) =>
    db.orders.filter((o) => o.sessionId === id && ['pending', 'paid', 'refund_review'].includes(o.status)).length
  const selectedSession = sessions.find((s) => s.id === sessionId)
  const sessionFull = selectedSession ? enrolledOf(selectedSession.id) >= selectedSession.capacity : false

  if (!currentMember) return <Navigate to={`/login?next=/checkout/${stage}`} replace />

  const codeInvalid = stage === 1 && referralCode.trim() !== '' && !validReferral

  const submit = () => {
    setError('')
    if (method === 'card' && (!cardNo.trim() || !cardExp.trim() || !cardCvc.trim())) {
      setError('請填寫信用卡資料（示範用，任意數字即可）')
      return
    }
    const r = placeOrder({ stage, paymentMethod: method, sessionId: sessionId || undefined, referralCode: referralCode || undefined })
    if (r.ok && r.orderId) {
      toast.success(method === 'card' ? '付款成功！' : '訂單已建立')
      navigate(`/order/${r.orderId}`)
    } else {
      setError(r.error ?? '落單失敗')
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display mb-1 text-2xl font-bold sm:text-3xl">報名：{course.name}</h1>
      <p className="mb-8 text-sm text-muted-foreground">{course.format}</p>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* 場次 */}
          <Card className="border-border/60">
            <CardContent className="p-6">
              <h2 className="font-display mb-4 flex items-center gap-2 text-lg font-bold">
                <CalendarDays className="h-5 w-5 text-amber-400" /> 揀場次
              </h2>
              <RadioGroup value={sessionId} onValueChange={setSessionId} className="space-y-3">
                {sessions.map((s) => {
                  const enrolled = enrolledOf(s.id)
                  const full = enrolled >= s.capacity
                  return (
                    <label key={s.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${sessionId === s.id ? 'gold-border bg-amber-500/5' : 'border-border/60'} ${full ? 'opacity-70' : ''}`}>
                      <RadioGroupItem value={s.id} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-semibold">
                          {s.title}
                          {full && <Badge variant="outline" className="border-orange-500/40 text-orange-400">已滿額</Badge>}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{s.dates.join('、')} · {s.time}</div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" /> {enrolled}/{s.capacity} 已報名
                        </div>
                      </div>
                    </label>
                  )
                })}
              </RadioGroup>

              {sessionFull && !waitlistJoined && (
                <div className="mt-4 rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
                  <p className="mb-3 text-sm font-semibold text-orange-300">呢班滿咗，留名排候補：</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input placeholder="姓名" value={waitlistName} onChange={(e) => setWaitlistName(e.target.value)} />
                    <Input placeholder="電話" value={waitlistPhone} onChange={(e) => setWaitlistPhone(e.target.value)} />
                    <Button variant="outline" className="border-orange-500/40 text-orange-300" onClick={() => {
                      if (!waitlistName.trim() || !waitlistPhone.trim()) { toast.error('請填姓名同電話'); return }
                      joinWaitlist({ sessionId, name: waitlistName, phone: waitlistPhone })
                      setWaitlistJoined(true)
                      toast.success('已加入候補名單')
                    }}>加入候補</Button>
                  </div>
                </div>
              )}
              {waitlistJoined && <p className="mt-4 text-sm text-emerald-400">✓ 已加入候補名單，有位會即刻通知你。你可以揀其他場次繼續報名。</p>}
            </CardContent>
          </Card>

          {/* 介紹碼 */}
          {stage === 1 && (
            <Card className="border-border/60">
              <CardContent className="p-6">
                <h2 className="font-display mb-4 text-lg font-bold">介紹碼（可選）</h2>
                <Input placeholder="例如 GOLD8888" value={referralCode} onChange={(e) => { setReferralCode(e.target.value); setError('') }} />
                {validReferral && <p className="mt-2 text-xs text-emerald-400">✓ 介紹碼有效（{validReferral.name}），即享 HK$880 優惠價</p>}
                {codeInvalid && <p className="mt-2 text-xs text-red-400">介紹碼無效／唔可以用自己嘅碼；留空則按原價 HK$980</p>}
              </CardContent>
            </Card>
          )}

          {/* 付款方式 */}
          <Card className="border-border/60">
            <CardContent className="p-6">
              <h2 className="font-display mb-4 text-lg font-bold">付款方式</h2>
              <RadioGroup value={method} onValueChange={(v) => setMethod(v as PaymentMethod)} className="space-y-3">
                <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${method === 'card' ? 'gold-border bg-amber-500/5' : 'border-border/60'}`}>
                  <RadioGroupItem value="card" />
                  <CreditCard className="h-5 w-5 text-amber-400" />
                  <div><div className="font-semibold">信用卡</div><div className="text-xs text-muted-foreground">Visa / Mastercard，即時確認</div></div>
                </label>
                <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${method === 'fps' ? 'gold-border bg-amber-500/5' : 'border-border/60'}`}>
                  <RadioGroupItem value="fps" />
                  <Smartphone className="h-5 w-5 text-amber-400" />
                  <div><div className="font-semibold">FPS 轉數快</div><div className="text-xs text-muted-foreground">轉賬後由職員核數確認</div></div>
                </label>
                <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${method === 'cash' ? 'gold-border bg-amber-500/5' : 'border-border/60'}`}>
                  <RadioGroupItem value="cash" />
                  <Banknote className="h-5 w-5 text-amber-400" />
                  <div><div className="font-semibold">人工收款</div><div className="text-xs text-muted-foreground">現金／親身交收，職員記數</div></div>
                </label>
              </RadioGroup>

              {method === 'card' && (
                <div className="mt-4 grid gap-3 rounded-lg border border-border/60 bg-muted/30 p-4 sm:grid-cols-3">
                  <div className="sm:col-span-3 space-y-1.5">
                    <Label>卡號碼</Label>
                    <Input placeholder="4242 4242 4242 4242" value={cardNo} onChange={(e) => setCardNo(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>有效期</Label>
                    <Input placeholder="12/28" value={cardExp} onChange={(e) => setCardExp(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>CVC</Label>
                    <Input placeholder="123" value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} />
                  </div>
                  <p className="text-xs text-muted-foreground sm:col-span-3">示範模式：唔會真正過數。</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 訂單摘要 */}
        <div className="lg:sticky lg:top-24 h-fit">
          <Card className="gold-border border-2">
            <CardContent className="p-6">
              <h3 className="font-display mb-4 text-lg font-bold">訂單摘要</h3>
              <div className="space-y-2.5 text-sm">
                {items.map((i) => (
                  <div key={i.label} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{i.label}{i.note ? `（${i.note}）` : ''}</span>
                    <span className="font-semibold">{formatHKD(i.amount)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="font-semibold">合計</span>
                  <span className="font-display text-2xl font-black text-amber-300">{formatHKD(total)}</span>
                </div>
              </div>
              {selectedSession && (
                <div className="mt-4 rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                  場次：{selectedSession.title}<br />{selectedSession.dates.join('、')} · {selectedSession.time}
                </div>
              )}
              {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
              <Button className="mt-5 h-11 w-full bg-gradient-to-r from-amber-400 to-amber-600 font-bold text-[hsl(222,47%,8%)] hover:opacity-90" onClick={submit} disabled={sessionFull}>
                {method === 'card' ? `確認付款 ${formatHKD(total)}` : '建立訂單'}
              </Button>
              {sessionFull && <p className="mt-2 text-center text-xs text-orange-400">呢班已滿額，請揀其他場次或加入候補</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
