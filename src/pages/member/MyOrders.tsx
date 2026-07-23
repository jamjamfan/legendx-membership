import { useState } from 'react'
import { useNavigate } from 'react-router'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { formatHKD, formatDate, ORDER_STATUS_LABEL, ORDER_STATUS_CLASS, PAYMENT_METHOD_LABEL } from '@/lib/courses'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

export default function MyOrders() {
  const { db, currentMember, requestRefund } = useStore()
  const navigate = useNavigate()
  const [refundOrder, setRefundOrder] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  if (!currentMember) return null
  const orders = db.orders
    .filter((o) => o.memberId === currentMember.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  return (
    <div className="space-y-4">
      {orders.length === 0 && (
        <Card className="border-border/60">
          <CardContent className="p-10 text-center">
            <p className="text-sm text-muted-foreground">未有訂單。</p>
            <Button className="mt-4 bg-gradient-to-r from-amber-400 to-amber-600 font-bold text-[hsl(222,47%,8%)]" onClick={() => navigate('/course/1')}>去報名</Button>
          </CardContent>
        </Card>
      )}
      {orders.map((o) => (
        <Card key={o.id} className="border-border/60">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{o.courseName}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {o.orderNo} · {formatDate(o.createdAt)} · {PAYMENT_METHOD_LABEL[o.paymentMethod]}
                  {o.sessionLabel ? ` · ${o.sessionLabel}` : ''}
                </div>
                {o.usedReferralCode && <div className="mt-1 text-xs text-emerald-400">使用介紹碼 {o.usedReferralCode}</div>}
              </div>
              <div className="text-right">
                <div className="font-display text-lg font-bold text-amber-300">{formatHKD(o.amount)}</div>
                <Badge variant="outline" className={`mt-1 ${ORDER_STATUS_CLASS[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</Badge>
              </div>
            </div>
            {o.refund && (
              <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                退款原因：{o.refund.reason}
                {o.refund.adminNote && <><br />職員備註:{o.refund.adminNote}</>}
              </div>
            )}
            <div className="mt-4 flex gap-2">
              {o.status === 'pending' && (
                <Button variant="outline" size="sm" className="gold-border" onClick={() => navigate(`/order/${o.id}`)}>查看付款指示</Button>
              )}
              {o.status === 'paid' && (
                <Button variant="outline" size="sm" className="border-orange-500/40 text-orange-300" onClick={() => { setRefundOrder(o.id); setReason('') }}>
                  <RotateCcw className="mr-1 h-3.5 w-3.5" /> 申請退款
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!refundOrder} onOpenChange={() => setRefundOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">申請退款</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">請講低退款原因，職員會盡快審批。</p>
            <Textarea placeholder="例如：時間未能配合" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            <Button className="w-full bg-gradient-to-r from-amber-400 to-amber-600 font-bold text-[hsl(222,47%,8%)]" onClick={() => {
              if (!reason.trim()) { toast.error('請填退款原因'); return }
              requestRefund(refundOrder!, reason)
              toast.success('退款申請已提交')
              setRefundOrder(null)
            }}>提交申請</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
