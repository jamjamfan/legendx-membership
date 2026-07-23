import { useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '../../lib/store'
import { formatHKD, stageLabel } from '../../lib/courses'
import { downloadCSV } from '../../lib/csv'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'

export default function AdminMembers() {
  const { db } = useStore()
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return db.members
      .filter((m) => !m.isAdmin)
      .filter(
        (m) =>
          !q ||
          m.name.toLowerCase().includes(q) ||
          m.phone.includes(q) ||
          m.referralCode.toLowerCase().includes(q),
      )
      .map((m) => {
        const referrer = m.referrerId ? db.members.find((x) => x.id === m.referrerId) : undefined
        const inquiries = db.inquiries.filter((i) => i.referrerId === m.id).length
        const referredOrders = db.orders.filter(
          (o) => o.referrerMemberId === m.id && o.status !== 'refunded',
        ).length
        const rebates = db.rebates.filter((r) => r.referrerId === m.id)
        const pendingRebate = rebates.filter((r) => r.status === 'pending').reduce((s, r) => s + r.amount, 0)
        const settledRebate = rebates.filter((r) => r.status === 'settled').reduce((s, r) => s + r.amount, 0)
        return { m, referrer, inquiries, referredOrders, pendingRebate, settledRebate }
      })
  }, [db, query])

  const exportCSV = () => {
    downloadCSV(
      'legendx_members.csv',
      ['姓名', '電話', '電郵', '階段', '介紹碼', '介紹人', '推廣頁瀏覽', '查詢數', '已介紹報名數', '待結算回贈', '已結算回贈'],
      rows.map(({ m, referrer, inquiries, referredOrders, pendingRebate, settledRebate }) => [
        m.name,
        m.phone,
        m.email,
        stageLabel(m.stage),
        m.referralCode,
        referrer?.name ?? '',
        m.promoViews,
        inquiries,
        referredOrders,
        pendingRebate,
        settledRebate,
      ]),
    )
    toast.success('已匯出會員 CSV')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">會員</h1>
          <p className="text-sm text-muted-foreground">共 {rows.length} 位會員（唔包括管理員）</p>
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="mr-2 h-4 w-4" />
          匯出 CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜尋姓名 / 電話 / 介紹碼"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>電話 / 電郵</TableHead>
                <TableHead>階段</TableHead>
                <TableHead>介紹碼</TableHead>
                <TableHead>介紹人</TableHead>
                <TableHead className="text-right">推廣頁瀏覽</TableHead>
                <TableHead className="text-right">查詢數</TableHead>
                <TableHead className="text-right">已介紹報名</TableHead>
                <TableHead className="text-right">待結算</TableHead>
                <TableHead className="text-right">已結算</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ m, referrer, inquiries, referredOrders, pendingRebate, settledRebate }) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>
                    <div>{m.phone}</div>
                    <div className="text-xs text-muted-foreground">{m.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-border">
                      {stageLabel(m.stage)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-amber-400">{m.referralCode}</TableCell>
                  <TableCell>{referrer?.name ?? '—'}</TableCell>
                  <TableCell className="text-right">{m.promoViews}</TableCell>
                  <TableCell className="text-right">{inquiries}</TableCell>
                  <TableCell className="text-right">{referredOrders}</TableCell>
                  <TableCell className="text-right text-amber-400">
                    {pendingRebate > 0 ? formatHKD(pendingRebate) : '—'}
                  </TableCell>
                  <TableCell className="text-right text-emerald-400">
                    {settledRebate > 0 ? formatHKD(settledRebate) : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                    冇符合搜尋條件嘅會員
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
