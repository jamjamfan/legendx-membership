import { Link } from 'react-router'
import {
  ClipboardList,
  GraduationCap,
  MessageSquareText,
  Undo2,
  Users,
  Wallet,
} from 'lucide-react'
import { useStore } from '../../lib/store'
import { formatHKD, formatDate, ORDER_STATUS_LABEL, ORDER_STATUS_CLASS } from '../../lib/courses'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: typeof Users }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-amber-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export default function AdminDashboard() {
  const { db } = useStore()

  const members = db.members.filter((m) => !m.isAdmin)
  const pendingOrders = db.orders.filter((o) => o.status === 'pending')
  const pendingAmount = pendingOrders.reduce((s, o) => s + o.amount, 0)
  const refundReviews = db.orders.filter((o) => o.status === 'refund_review')
  const pendingRebates = db.rebates.filter((r) => r.status === 'pending')
  const settledRebates = db.rebates.filter((r) => r.status === 'settled')
  const newInquiries = db.inquiries.filter((i) => i.status === 'new')
  const revenue = db.orders.filter((o) => o.status === 'paid').reduce((s, o) => s + o.amount, 0)

  const latestPending = [...pendingOrders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5)
  const latestRefunds = [...refundReviews].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">總覽</h1>
        <p className="text-sm text-muted-foreground">LegendX 會員系統即時狀況</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="會員總數" value={String(members.length)} sub="唔包括管理員帳戶" icon={Users} />
        <StatCard label="訂單總數" value={String(db.orders.length)} icon={ClipboardList} />
        <StatCard
          label="待確認收款"
          value={String(pendingOrders.length)}
          sub={`合共 ${formatHKD(pendingAmount)}`}
          icon={Wallet}
        />
        <StatCard label="待審批退款" value={String(refundReviews.length)} icon={Undo2} />
        <StatCard
          label="待結算獎學金"
          value={formatHKD(pendingRebates.reduce((s, r) => s + r.amount, 0))}
          sub={`${pendingRebates.length} 筆待結算`}
          icon={GraduationCap}
        />
        <StatCard label="新查詢" value={String(newInquiries.length)} icon={MessageSquareText} />
        <StatCard
          label="已結算獎學金"
          value={formatHKD(settledRebates.reduce((s, r) => s + r.amount, 0))}
          sub={`${settledRebates.length} 筆已結算`}
          icon={GraduationCap}
        />
        <StatCard label="總營收" value={formatHKD(revenue)} sub="已付款訂單金額" icon={Wallet} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">待確認收款訂單</CardTitle>
            <Link to="/admin/orders" className="text-sm text-amber-400 hover:underline">
              查看全部 →
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestPending.length === 0 && <p className="text-sm text-muted-foreground">暫時冇待確認訂單。</p>}
            {latestPending.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {o.memberName} · {o.courseName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {o.orderNo} · {formatDate(o.createdAt)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold text-amber-400">{formatHKD(o.amount)}</span>
                  <Badge variant="outline" className={ORDER_STATUS_CLASS[o.status]}>
                    {ORDER_STATUS_LABEL[o.status]}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">待審批退款</CardTitle>
            <Link to="/admin/refunds" className="text-sm text-amber-400 hover:underline">
              前往審批 →
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestRefunds.length === 0 && <p className="text-sm text-muted-foreground">暫時冇退款申請。</p>}
            {latestRefunds.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {o.memberName} · {o.courseName}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {o.refund?.reason ?? '—'}
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-orange-400">{formatHKD(o.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
