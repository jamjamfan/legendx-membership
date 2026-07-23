import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '../../lib/store'
import {
  formatHKD,
  formatDate,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_CLASS,
  PAYMENT_METHOD_LABEL,
} from '../../lib/courses'
import { downloadCSV } from '../../lib/csv'
import type { OrderStatus } from '../../lib/types'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'

type Filter = 'all' | OrderStatus

const FILTER_LABEL: Record<Filter, string> = {
  all: '全部',
  pending: '待確認',
  paid: '已付款',
  refund_review: '退款審核中',
  refunded: '已退款',
}

export default function AdminOrders() {
  const { db, confirmPayment } = useStore()
  const [filter, setFilter] = useState<Filter>('all')

  const sorted = useMemo(
    () => [...db.orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [db.orders],
  )
  const filtered = filter === 'all' ? sorted : sorted.filter((o) => o.status === filter)
  const countOf = (f: Filter) => (f === 'all' ? sorted.length : sorted.filter((o) => o.status === f).length)

  const exportCSV = () => {
    downloadCSV(
      'legendx_orders.csv',
      ['訂單號', '會員', '課程', '階段', '場次', '金額', '付款方式', '狀態', '建立日期', '介紹碼'],
      filtered.map((o) => [
        o.orderNo,
        o.memberName,
        o.courseName,
        o.stage,
        o.sessionLabel ?? '',
        o.amount,
        PAYMENT_METHOD_LABEL[o.paymentMethod],
        ORDER_STATUS_LABEL[o.status],
        formatDate(o.createdAt),
        o.usedReferralCode ?? '',
      ]),
    )
    toast.success('已匯出訂單 CSV')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">訂單</h1>
          <p className="text-sm text-muted-foreground">全部課程訂單同收款狀態</p>
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="mr-2 h-4 w-4" />
          匯出 CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList>
              {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
                <TabsTrigger key={f} value={f}>
                  {FILTER_LABEL[f]}（{countOf(f)}）
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>訂單號</TableHead>
                <TableHead>會員</TableHead>
                <TableHead>課程 / 階段</TableHead>
                <TableHead>場次</TableHead>
                <TableHead className="text-right">金額</TableHead>
                <TableHead>付款方式</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>建立日期</TableHead>
                <TableHead>介紹碼</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.orderNo}</TableCell>
                  <TableCell className="font-medium">{o.memberName}</TableCell>
                  <TableCell>{o.courseName}</TableCell>
                  <TableCell className="text-muted-foreground">{o.sessionLabel ?? '—'}</TableCell>
                  <TableCell className="text-right font-semibold text-amber-400">{formatHKD(o.amount)}</TableCell>
                  <TableCell>{PAYMENT_METHOD_LABEL[o.paymentMethod]}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={ORDER_STATUS_CLASS[o.status]}>
                      {ORDER_STATUS_LABEL[o.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(o.createdAt)}</TableCell>
                  <TableCell className="font-mono text-xs">{o.usedReferralCode ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    {o.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          confirmPayment(o.id)
                          toast.success(`已確認收款：${o.orderNo}`)
                        }}
                      >
                        確認收款
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                    呢個狀態暫時冇訂單
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
