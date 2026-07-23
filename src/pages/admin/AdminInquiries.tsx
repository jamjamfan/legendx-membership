import { useState } from 'react'
import { toast } from 'sonner'
import { useStore } from '../../lib/store'
import { formatDate } from '../../lib/courses'
import type { InquiryStatus } from '../../lib/types'
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

type Filter = 'all' | InquiryStatus

const STATUS_LABEL: Record<InquiryStatus, string> = {
  new: '新查詢',
  contacted: '已聯絡',
  converted: '已轉化',
}

const STATUS_CLASS: Record<InquiryStatus, string> = {
  new: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  contacted: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  converted: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
}

export default function AdminInquiries() {
  const { db, setInquiryStatus } = useStore()
  const [filter, setFilter] = useState<Filter>('all')

  const sorted = [...db.inquiries].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  const filtered = filter === 'all' ? sorted : sorted.filter((i) => i.status === filter)
  const countOf = (f: Filter) => (f === 'all' ? sorted.length : sorted.filter((i) => i.status === f).length)

  const referrerName = (referrerId?: string) => {
    if (!referrerId) return '自然流量'
    return db.members.find((m) => m.id === referrerId)?.name ?? '自然流量'
  }

  const advance = (id: string, status: InquiryStatus) => {
    setInquiryStatus(id, status)
    toast.success(`已更新為「${STATUS_LABEL[status]}」`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">查詢名單</h1>
        <p className="text-sm text-muted-foreground">推廣頁同網站收到嘅查詢，跟進狀態一目了然</p>
      </div>

      <Card>
        <CardHeader>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList>
              <TabsTrigger value="all">全部（{countOf('all')}）</TabsTrigger>
              <TabsTrigger value="new">新查詢（{countOf('new')}）</TabsTrigger>
              <TabsTrigger value="contacted">已聯絡（{countOf('contacted')}）</TabsTrigger>
              <TabsTrigger value="converted">已轉化（{countOf('converted')}）</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>電話</TableHead>
                <TableHead>留言</TableHead>
                <TableHead>歸屬會員</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>日期</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell>{i.phone}</TableCell>
                  <TableCell className="max-w-xs">
                    <span className="line-clamp-2 text-sm text-muted-foreground">{i.message ?? '—'}</span>
                  </TableCell>
                  <TableCell>
                    {i.referrerId ? (
                      <span className="text-amber-400">{referrerName(i.referrerId)}</span>
                    ) : (
                      <span className="text-muted-foreground">自然流量</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_CLASS[i.status]}>
                      {STATUS_LABEL[i.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(i.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {i.status === 'new' && (
                        <Button size="sm" variant="outline" onClick={() => advance(i.id, 'contacted')}>
                          標記已聯絡
                        </Button>
                      )}
                      {i.status === 'contacted' && (
                        <Button size="sm" variant="outline" onClick={() => advance(i.id, 'converted')}>
                          標記已轉化
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    呢個狀態暫時冇查詢
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
