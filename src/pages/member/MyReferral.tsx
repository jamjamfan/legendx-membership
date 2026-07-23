import { useState } from 'react'
import { Copy, Eye, Gift, MessageCircleQuestion, UserCheck, Users } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { formatHKD, formatDate, slotsOf, REBATE_STATUS_LABEL, REBATE_STATUS_CLASS } from '@/lib/courses'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { REBATE_SCHEDULE } from '@/lib/courses'

export default function MyReferral() {
  const { db, currentMember } = useStore()
  const [showQR, setShowQR] = useState(false)

  if (!currentMember) return null

  const promoUrl = `${window.location.origin}${window.location.pathname}#/p/${currentMember.referralCode}`
  const inquiries = db.inquiries.filter((i) => i.referrerId === currentMember.id)
  const referredOrders = db.orders.filter((o) => o.referrerMemberId === currentMember.id && o.status !== 'refunded')
  const paidReferred = referredOrders.filter((o) => ['paid', 'refund_review'].includes(o.status))
  const myRebates = db.rebates.filter((r) => r.referrerId === currentMember.id)
  const pendingTotal = myRebates.filter((r) => r.status === 'pending').reduce((s, r) => s + r.amount, 0)
  const settledTotal = myRebates.filter((r) => r.status === 'settled').reduce((s, r) => s + r.amount, 0)
  const slotGroups = slotsOf(currentMember, db.orders, db.rebates, db.settings.rebateSlotExpiryDays)

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label}已複製`)
    } catch {
      toast.error('複製失敗，請手動複製')
    }
  }

  const stats = [
    { icon: Eye, label: '推廣頁瀏覽', value: currentMember.promoViews },
    { icon: MessageCircleQuestion, label: '查詢', value: inquiries.length },
    { icon: Users, label: '已報名', value: referredOrders.length },
    { icon: UserCheck, label: '已付費', value: paidReferred.length },
  ]

  return (
    <div className="space-y-6">
      {/* 專屬連結 + QR */}
      <Card className="gold-border border-2">
        <CardContent className="p-6">
          <h3 className="font-display mb-1 text-lg font-bold">你嘅專屬推廣頁</h3>
          <p className="mb-4 text-sm text-muted-foreground">分享呢條連結或 QR 碼，朋友入嚟就會見到你嘅推薦同 HK$880 優惠價。</p>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <button onClick={() => setShowQR(!showQR)} className="shrink-0 rounded-xl bg-white p-3 transition-transform hover:scale-105">
              <QRCodeSVG value={promoUrl} size={showQR ? 180 : 96} />
            </button>
            <div className="w-full flex-1 space-y-2">
              <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 font-mono text-xs break-all">{promoUrl}</div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="bg-gradient-to-r from-amber-400 to-amber-600 font-semibold text-[hsl(222,47%,8%)]" onClick={() => copy(promoUrl, '連結')}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> 複製連結
                </Button>
                <Button size="sm" variant="outline" className="gold-border" onClick={() => copy(currentMember.referralCode, '介紹碼')}>
                  介紹碼：{currentMember.referralCode}
                </Button>
                <a href={promoUrl} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="ghost">預覽推廣頁</Button>
                </a>
              </div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border border-border/60 bg-background/50 p-3 text-center">
                <s.icon className="mx-auto mb-1 h-4 w-4 text-amber-400" />
                <div className="font-display text-lg font-bold">{s.value}</div>
                <div className="text-[11px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 名額進度 */}
      <Card className="border-border/60">
        <CardContent className="p-6">
          <h3 className="font-display mb-1 flex items-center gap-2 text-lg font-bold"><Gift className="h-5 w-5 text-amber-400" /> 獎學金名額</h3>
          {slotGroups.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              完成第二階段即獲 3 個名額（回贈 $1,000 / $2,000 / $3,800）；升級第三階段再獲 2 個（$1,000 / $2,800）。
            </p>
          )}
          <div className="mt-4 space-y-5">
            {slotGroups.map((g) => (
              <div key={g.program}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold">第{g.program === 2 ? '二' : '三'}階段名額（{g.total} 個）</span>
                  {g.expired ? (
                    <Badge variant="outline" className="border-slate-500/40 text-slate-400">已過期</Badge>
                  ) : (
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
                      有效期至 {g.expiresAt ? formatDate(g.expiresAt) : '-'} · 剩 {g.daysLeft} 日
                    </Badge>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {REBATE_SCHEDULE[g.program].map((amt, i) => {
                    const used = i < g.used
                    const rebate = myRebates.find((r) => r.program === g.program && r.slotIndex === i + 1 && r.status !== 'voided')
                    return (
                      <div key={i} className={`rounded-lg border p-3 text-sm ${used ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-border/60 bg-background/40'}`}>
                        <div className="text-xs text-muted-foreground">第 {i + 1} 個朋友</div>
                        <div className="font-display mt-0.5 font-bold text-amber-300">{formatHKD(amt)}</div>
                        <div className="mt-1 text-xs">
                          {rebate ? (
                            <Badge variant="outline" className={REBATE_STATUS_CLASS[rebate.status]}>{REBATE_STATUS_LABEL[rebate.status]} · {rebate.referredName}</Badge>
                          ) : (
                            <span className="text-muted-foreground/60">{g.expired ? '已過期' : '未使用'}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 回贈記錄 */}
      <Card className="border-border/60">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">回贈記錄</h3>
            <div className="text-right text-sm">
              <span className="text-muted-foreground">待結算 </span><span className="font-bold text-amber-300">{formatHKD(pendingTotal)}</span>
              <span className="ml-3 text-muted-foreground">已結算 </span><span className="font-bold text-emerald-400">{formatHKD(settledTotal)}</span>
            </div>
          </div>
          {myRebates.length === 0 ? (
            <p className="text-sm text-muted-foreground">未有回贈記錄。分享你嘅連結，朋友報名就有回贈！</p>
          ) : (
            <div className="space-y-2">
              {myRebates.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3 text-sm">
                  <div>
                    <span className="font-semibold">{r.referredName}</span>
                    <span className="ml-2 text-xs text-muted-foreground">第{r.program === 2 ? '二' : '三'}階段名額 · 第 {r.slotIndex} 個 · {formatDate(r.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-amber-300">{formatHKD(r.amount)}</span>
                    <Badge variant="outline" className={REBATE_STATUS_CLASS[r.status]}>{REBATE_STATUS_LABEL[r.status]}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground/70">回贈由團隊經 FPS／現金過數，過數後狀態會更新為「已結算」。</p>
        </CardContent>
      </Card>
    </div>
  )
}
