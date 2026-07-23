import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useStore } from '../../lib/store'
import { formatHKD, formatDate, REBATE_STATUS_LABEL, REBATE_STATUS_CLASS } from '../../lib/courses'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'

export default function AdminRebates() {
  const { db, settleRebate, setRebateSlotExpiryDays } = useStore()
  const [days, setDays] = useState(String(db.settings.rebateSlotExpiryDays))

  useEffect(() => {
    setDays(String(db.settings.rebateSlotExpiryDays))
  }, [db.settings.rebateSlotExpiryDays])

  const pending = db.rebates.filter((r) => r.status === 'pending')
  const settled = db.rebates.filter((r) => r.status === 'settled')
  const sorted = [...db.rebates].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  const saveDays = () => {
    const n = Number(days)
    if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
      toast.error('請輸入有效嘅正整數日數')
      return
    }
    setRebateSlotExpiryDays(n)
    toast.success(`已更新名額有效期為 ${n} 日`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">獎學金結算</h1>
        <p className="text-sm text-muted-foreground">介紹朋友獎學金回贈嘅結算同名額設定</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">名額有效期設定</CardTitle>
          <CardDescription>
            介紹獎學金名額嘅有效期，由會員付清該階段費用當日起計；過期名額會自動失效。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex max-w-sm items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="expiry-days">有效期（日數）</Label>
              <Input
                id="expiry-days"
                type="number"
                min={1}
                step={1}
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </div>
            <Button onClick={saveDays}>儲存</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">待結算總額</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">
              {formatHKD(pending.reduce((s, r) => s + r.amount, 0))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{pending.length} 筆待結算</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">已結算總額</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {formatHKD(settled.reduce((s, r) => s + r.amount, 0))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{settled.length} 筆已結算</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">全部回贈紀錄（{db.rebates.length}）</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>介紹人</TableHead>
                <TableHead>朋友</TableHead>
                <TableHead>計劃</TableHead>
                <TableHead>名額</TableHead>
                <TableHead className="text-right">金額</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>建立日期</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.referrerName}</TableCell>
                  <TableCell>{r.referredName}</TableCell>
                  <TableCell>{r.program === 2 ? '第二階段名額' : '第三階段名額'}</TableCell>
                  <TableCell>第 {r.slotIndex} 個</TableCell>
                  <TableCell className="text-right font-semibold text-amber-400">{formatHKD(r.amount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={REBATE_STATUS_CLASS[r.status]}>
                      {REBATE_STATUS_LABEL[r.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {r.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          settleRebate(r.id)
                          toast.success(`已結算 ${r.referrerName} 嘅 ${formatHKD(r.amount)} 回贈`)
                        }}
                      >
                        標記已結算
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    暫時冇回贈紀錄
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
