import { useState } from 'react'
import { Download, ScanLine } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '../../lib/store'
import { formatDate } from '../../lib/courses'
import { nextClassDate } from '../../lib/reminders'
import { downloadCSV } from '../../lib/csv'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Textarea } from '../../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function AdminAttendance() {
  const { db, checkIn, manualCheckIn } = useStore()
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [payload, setPayload] = useState('')

  const session = db.sessions.find((s) => s.id === selectedId) ?? db.sessions[0]
  const classDate = session ? nextClassDate(session) : undefined

  const enrolledOrders = session
    ? db.orders.filter(
        (o) => o.sessionId === session.id && ['paid', 'refund_review'].includes(o.status),
      )
    : []
  const attendanceToday = session
    ? db.attendance.filter((a) => a.sessionId === session.id && a.date === classDate)
    : []
  const hasCheckedIn = (memberId: string) => attendanceToday.some((a) => a.memberId === memberId)

  const recent = [...db.attendance].sort((a, b) => (a.checkedInAt < b.checkedInAt ? 1 : -1)).slice(0, 20)

  const sessionTitle = (sessionId: string) => db.sessions.find((s) => s.id === sessionId)?.title ?? sessionId

  const notifyResult = (res: { ok: boolean; error?: string; already?: boolean; memberName?: string; date?: string }) => {
    if (!res.ok) {
      toast.error(res.error ?? '簽到失敗')
    } else if (res.already) {
      toast.info(`${res.memberName} 今日已經簽到咗（${res.date}）`)
    } else {
      toast.success(`${res.memberName} 簽到成功（${res.date}）`)
    }
  }

  const scanCheckIn = () => {
    const raw = payload.trim()
    if (!raw) {
      toast.error('請先貼上 QR 碼內容')
      return
    }
    notifyResult(checkIn(raw))
    setPayload('')
  }

  const exportCSV = () => {
    if (!session) return
    const records = db.attendance
      .filter((a) => a.sessionId === session.id)
      .sort((a, b) => (a.checkedInAt < b.checkedInAt ? 1 : -1))
    downloadCSV(
      `legendx_attendance_${session.id}.csv`,
      ['場次', '日期', '會員', '簽到方式', '簽到時間'],
      records.map((a) => [session.title, a.date, a.memberName, a.method === 'qr' ? 'QR 掃碼' : '手動', `${formatDate(a.checkedInAt)} ${formatTime(a.checkedInAt)}`]),
    )
    toast.success('已匯出出席 CSV')
  }

  if (!session) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">出席簽到</h1>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            暫時冇場次，請先喺「課程場次」建立場次。
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">出席簽到</h1>
          <p className="text-sm text-muted-foreground">掃描學員 QR 通行證或手動簽到</p>
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="mr-2 h-4 w-4" />
          匯出出席 CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">選擇場次</CardTitle>
          <CardDescription>
            下一堂：<span className="font-medium text-amber-400">{classDate ?? '冇課堂日期'}</span>
            {classDate && ` · ${session.time}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={session.id} onValueChange={setSelectedId}>
            <SelectTrigger className="max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {db.sessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">掃碼簽到</CardTitle>
          <CardDescription>貼上學員 QR 通行證內容（格式：LXCHECKIN|會員ID|場次ID）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder="LXCHECKIN|m_demo|s1"
            rows={2}
            className="font-mono text-sm"
          />
          <Button onClick={scanCheckIn}>
            <ScanLine className="mr-2 h-4 w-4" />
            簽到
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            學員名單（{classDate ?? '—'}）· 已簽到 {attendanceToday.length} / {enrolledOrders.length}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>學員</TableHead>
                <TableHead>訂單號</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrolledOrders.map((o) => {
                const checked = hasCheckedIn(o.memberId)
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.memberName}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{o.orderNo}</TableCell>
                    <TableCell>
                      {checked ? (
                        <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                          已簽到
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-500/15 text-slate-400 border-slate-500/30">
                          未簽到
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!checked && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => notifyResult(manualCheckIn(o.memberId, session.id, 'manual'))}
                        >
                          手動簽到
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
              {enrolledOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    呢個場次暫時冇已付款學員
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近簽到紀錄</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>場次</TableHead>
                <TableHead>會員</TableHead>
                <TableHead>方式</TableHead>
                <TableHead>簽到時間</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.date}</TableCell>
                  <TableCell className="text-muted-foreground">{sessionTitle(a.sessionId)}</TableCell>
                  <TableCell className="font-medium">{a.memberName}</TableCell>
                  <TableCell>{a.method === 'qr' ? 'QR 掃碼' : '手動'}</TableCell>
                  <TableCell className="text-muted-foreground">{formatTime(a.checkedInAt)}</TableCell>
                </TableRow>
              ))}
              {recent.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    暫時冇簽到紀錄
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
