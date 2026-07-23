import { Link, useParams } from 'react-router'
import { CalendarPlus, CheckCircle2, Clock4, Smartphone } from 'lucide-react'
import { formatHKD, formatDate, PAYMENT_METHOD_LABEL } from '@/lib/courses'
import { downloadICS } from '@/lib/ics'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function OrderComplete() {
  const { orderId } = useParams()
  const { db } = useStore()
  const order = db.orders.find((o) => o.id === orderId)

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-muted-foreground">搵唔到呢張訂單。</p>
        <Link to="/member"><Button variant="outline" className="mt-4 gold-border">去會員中心</Button></Link>
      </div>
    )
  }

  const session = order.sessionId ? db.sessions.find((s) => s.id === order.sessionId) : undefined
  const paid = order.status === 'paid'

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="mb-8 text-center">
        {paid ? (
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-emerald-400" />
        ) : (
          <Clock4 className="mx-auto mb-4 h-16 w-16 text-amber-400" />
        )}
        <h1 className="font-display text-3xl font-black">{paid ? '報名成功！' : '訂單已建立'}</h1>
        <p className="mt-2 text-muted-foreground">
          {paid ? '我哋已經收到你嘅付款，課堂見！' : '完成付款後，職員會盡快確認你嘅訂單。'}
        </p>
      </div>

      <Card className="gold-border">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">訂單編號</span>
            <span className="font-mono font-semibold">{order.orderNo}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">課程</span>
            <span className="font-semibold">{order.courseName}</span>
          </div>
          {order.sessionLabel && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">場次</span>
              <span>{order.sessionLabel}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">金額</span>
            <span className="font-display text-xl font-bold text-amber-300">{formatHKD(order.amount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">付款方式</span>
            <span>{PAYMENT_METHOD_LABEL[order.paymentMethod]}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">狀態</span>
            <Badge variant="outline" className={paid ? 'border-emerald-500/40 text-emerald-400' : 'border-amber-500/40 text-amber-400'}>
              {paid ? '已付款' : '待確認'}
            </Badge>
          </div>
          {order.usedReferralCode && (
            <div className="rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-300">
              已使用介紹碼 {order.usedReferralCode}，享介紹優惠價。
            </div>
          )}
        </CardContent>
      </Card>

      {!paid && order.paymentMethod === 'fps' && (
        <Card className="mt-4 border-amber-500/40">
          <CardContent className="p-6">
            <h3 className="font-display mb-3 flex items-center gap-2 font-bold"><Smartphone className="h-5 w-5 text-amber-400" /> FPS 轉數快付款指示</h3>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground/90">
              <li>打開你嘅銀行 App，揀「轉數快 FPS」</li>
              <li>收款識別碼（FPS ID）：<span className="font-mono font-bold text-amber-300">163456789</span>（LegendX Education Ltd）</li>
              <li>金額：<b>{formatHKD(order.amount)}</b></li>
              <li>備註請填你嘅訂單編號 <span className="font-mono">{order.orderNo}</span></li>
              <li>過數後職員會核數確認（一般即日內）</li>
            </ol>
          </CardContent>
        </Card>
      )}

      {!paid && order.paymentMethod === 'cash' && (
        <Card className="mt-4 border-amber-500/40">
          <CardContent className="p-6">
            <h3 className="font-display mb-3 font-bold">人工收款安排</h3>
            <p className="text-sm leading-relaxed text-foreground/90">
              請 WhatsApp <span className="font-mono font-bold text-amber-300">9123 4567</span> 聯絡職員安排現金交收，
              或於開課首堂提早 30 分鐘到場繳費。繳費後訂單會更新為「已付款」。
            </p>
          </CardContent>
        </Card>
      )}

      {session && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" className="flex-1 gold-border" onClick={() => downloadICS(session, order.courseName)}>
            <CalendarPlus className="mr-2 h-4 w-4" /> 加入行事曆（全部 {session.dates.length} 堂）
          </Button>
          <Link to="/member" className="flex-1">
            <Button className="w-full bg-gradient-to-r from-amber-400 to-amber-600 font-bold text-[hsl(222,47%,8%)]">去會員中心</Button>
          </Link>
        </div>
      )}

      {session && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          上課日期：{session.dates.map(formatDate).join('、')} · {session.time}<br />
          地點：{session.venue} · 開課前 1 日同埋 3 小時會有提醒
        </p>
      )}
    </div>
  )
}
