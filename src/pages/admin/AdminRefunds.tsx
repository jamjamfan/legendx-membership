import { useState } from 'react'
import { toast } from 'sonner'
import { useStore } from '../../lib/store'
import { formatHKD, formatDate } from '../../lib/courses'
import type { Order } from '../../lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Textarea } from '../../components/ui/textarea'
import { Label } from '../../components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'

interface ReviewTarget {
  order: Order
  approve: boolean
}

export default function AdminRefunds() {
  const { db, reviewRefund } = useStore()
  const [target, setTarget] = useState<ReviewTarget | null>(null)
  const [note, setNote] = useState('')

  const reviewing = db.orders
    .filter((o) => o.status === 'refund_review')
    .sort((a, b) => ((a.refund?.requestedAt ?? '') < (b.refund?.requestedAt ?? '') ? 1 : -1))
  const history = db.orders
    .filter((o) => o.refund && o.refund.status !== 'reviewing')
    .sort((a, b) => ((a.refund?.reviewedAt ?? '') < (b.refund?.reviewedAt ?? '') ? 1 : -1))

  const openDialog = (order: Order, approve: boolean) => {
    setTarget({ order, approve })
    setNote('')
  }

  const submit = () => {
    if (!target) return
    reviewRefund(target.order.id, target.approve, note.trim() || undefined)
    toast.success(target.approve ? `已批准退款：${target.order.orderNo}` : `已拒絕退款：${target.order.orderNo}`)
    setTarget(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">退款審批</h1>
        <p className="text-sm text-muted-foreground">審批學員退款申請；批准後相關介紹回贈會自動作廢</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">待審批（{reviewing.length}）</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>會員</TableHead>
                <TableHead>課程</TableHead>
                <TableHead className="text-right">金額</TableHead>
                <TableHead>退款原因</TableHead>
                <TableHead>申請日期</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviewing.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.memberName}</TableCell>
                  <TableCell>{o.courseName}</TableCell>
                  <TableCell className="text-right font-semibold text-orange-400">{formatHKD(o.amount)}</TableCell>
                  <TableCell className="max-w-xs">
                    <span className="line-clamp-2 text-sm">{o.refund?.reason ?? '—'}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {o.refund ? formatDate(o.refund.requestedAt) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => openDialog(o, true)}>
                        批准退款
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openDialog(o, false)}>
                        拒絕
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {reviewing.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    暫時冇待審批嘅退款申請
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">處理紀錄（{history.length}）</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>會員</TableHead>
                <TableHead>課程</TableHead>
                <TableHead className="text-right">金額</TableHead>
                <TableHead>結果</TableHead>
                <TableHead>備註</TableHead>
                <TableHead>處理日期</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.memberName}</TableCell>
                  <TableCell>{o.courseName}</TableCell>
                  <TableCell className="text-right">{formatHKD(o.amount)}</TableCell>
                  <TableCell>
                    {o.refund?.status === 'approved' ? (
                      <Badge variant="outline" className="bg-slate-500/15 text-slate-400 border-slate-500/30">
                        已退款
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                        已拒絕
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <span className="line-clamp-2 text-sm text-muted-foreground">{o.refund?.adminNote ?? '—'}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {o.refund?.reviewedAt ? formatDate(o.refund.reviewedAt) : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    暫時冇處理紀錄
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{target?.approve ? '批准退款' : '拒絕退款'}</DialogTitle>
            <DialogDescription>
              {target && (
                <>
                  {target.order.memberName} · {target.order.courseName} · {formatHKD(target.order.amount)}
                  <br />
                  退款原因：{target.order.refund?.reason ?? '—'}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="refund-note">備註（可選）</Label>
            <Textarea
              id="refund-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={target?.approve ? '例如：已透過 FPS 退回' : '例如：已開課，按條款未能退款'}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              取消
            </Button>
            <Button onClick={submit}>{target?.approve ? '確認批准' : '確認拒絕'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
