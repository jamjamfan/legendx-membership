import { useState } from 'react'
import { Pencil, Plus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '../../lib/store'
import { formatDate, stageLabel } from '../../lib/courses'
import type { CourseSession, CourseStage } from '../../lib/types'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'

interface FormState {
  stage: string
  title: string
  dates: string
  time: string
  venue: string
  instructor: string
  capacity: string
}

const EMPTY_FORM: FormState = {
  stage: '1',
  title: '',
  dates: '',
  time: '',
  venue: '',
  instructor: '',
  capacity: '30',
}

export default function AdminSessions() {
  const { db, upsertSession, deleteSession, promoteWaitlist } = useStore()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CourseSession | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [waitlistSession, setWaitlistSession] = useState<CourseSession | null>(null)

  const enrolledOf = (sessionId: string) =>
    db.orders.filter(
      (o) => o.sessionId === sessionId && ['pending', 'paid', 'refund_review'].includes(o.status),
    ).length
  const waitingOf = (sessionId: string) =>
    db.waitlist.filter((w) => w.sessionId === sessionId && w.status === 'waiting').length

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (s: CourseSession) => {
    setEditing(s)
    setForm({
      stage: String(s.stage),
      title: s.title,
      dates: s.dates.join(', '),
      time: s.time,
      venue: s.venue,
      instructor: s.instructor,
      capacity: String(s.capacity),
    })
    setFormOpen(true)
  }

  const save = () => {
    const dates = form.dates
      .split(/[,，\n]/)
      .map((d) => d.trim())
      .filter(Boolean)
    if (!form.title.trim()) {
      toast.error('請填寫場次標題')
      return
    }
    if (dates.length === 0 || dates.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d))) {
      toast.error('日期格式唔啱，請用 yyyy-mm-dd，多個日期用逗號分隔')
      return
    }
    const capacity = Number(form.capacity)
    if (!Number.isInteger(capacity) || capacity < 1) {
      toast.error('名額要係正整數')
      return
    }
    upsertSession({
      id: editing?.id ?? `s_${Date.now()}`,
      stage: Number(form.stage) as CourseStage,
      title: form.title.trim(),
      dates: dates.sort(),
      time: form.time.trim(),
      venue: form.venue.trim(),
      instructor: form.instructor.trim(),
      capacity,
    })
    toast.success(editing ? '已更新場次' : '已新增場次')
    setFormOpen(false)
  }

  const waitlistEntries = waitlistSession
    ? db.waitlist
        .filter((w) => w.sessionId === waitlistSession.id)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">課程場次</h1>
          <p className="text-sm text-muted-foreground">管理各階段開班場次、名額同候補名單</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          新增場次
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>標題</TableHead>
                <TableHead>階段</TableHead>
                <TableHead>日期</TableHead>
                <TableHead>時間</TableHead>
                <TableHead>地點</TableHead>
                <TableHead>導師</TableHead>
                <TableHead className="text-right">已報名 / 名額</TableHead>
                <TableHead className="text-right">候補</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {db.sessions.map((s) => {
                const enrolled = enrolledOf(s.id)
                const waiting = waitingOf(s.id)
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-border">
                        {stageLabel(s.stage)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.dates.join('、')}</TableCell>
                    <TableCell className="text-sm">{s.time}</TableCell>
                    <TableCell className="max-w-[180px]">
                      <span className="line-clamp-2 text-sm">{s.venue}</span>
                    </TableCell>
                    <TableCell className="text-sm">{s.instructor}</TableCell>
                    <TableCell className="text-right">
                      <span className={enrolled >= s.capacity ? 'font-semibold text-orange-400' : ''}>
                        {enrolled} / {s.capacity}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setWaitlistSession(s)}>
                        <Users className="mr-1 h-4 w-4" />
                        {waiting}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          編輯
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-red-400 hover:text-red-300">
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              刪除
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>刪除場次？</AlertDialogTitle>
                              <AlertDialogDescription>
                                「{s.title}」會被刪除。已有報名訂單會保留，但會失去場次連結。此操作不能復原。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  deleteSession(s.id)
                                  toast.success(`已刪除場次：${s.title}`)
                                }}
                              >
                                確認刪除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {db.sessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    暫時冇場次，按「新增場次」建立
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? '編輯場次' : '新增場次'}</DialogTitle>
            <DialogDescription>填寫場次資料；日期用 yyyy-mm-dd，多個日期用逗號分隔。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>階段</Label>
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">第一階段</SelectItem>
                    <SelectItem value="2">第二階段</SelectItem>
                    <SelectItem value="3">第三階段</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-capacity">名額</Label>
                <Input
                  id="session-capacity"
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-title">標題</Label>
              <Input
                id="session-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="例如：第一階段 · 10月班"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-dates">日期（yyyy-mm-dd，逗號分隔）</Label>
              <Input
                id="session-dates"
                value={form.dates}
                onChange={(e) => setForm({ ...form, dates: e.target.value })}
                placeholder="2026-10-06, 2026-10-08, 2026-10-13"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="session-time">時間</Label>
                <Input
                  id="session-time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  placeholder="19:00–22:30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-instructor">導師</Label>
                <Input
                  id="session-instructor"
                  value={form.instructor}
                  onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-venue">地點</Label>
              <Input
                id="session-venue"
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              取消
            </Button>
            <Button onClick={save}>{editing ? '儲存變更' : '新增場次'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!waitlistSession} onOpenChange={(open) => !open && setWaitlistSession(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>候補名單 · {waitlistSession?.title}</DialogTitle>
            <DialogDescription>滿額場次嘅候補登記；補上後請聯絡學員完成報名。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {waitlistEntries.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">呢個場次暫時冇候補登記</p>
            )}
            {waitlistEntries.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                <div>
                  <div className="text-sm font-medium">
                    {w.name} · {w.phone}
                  </div>
                  <div className="text-xs text-muted-foreground">登記日期：{formatDate(w.createdAt)}</div>
                </div>
                {w.status === 'waiting' ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      promoteWaitlist(w.id)
                      toast.success(`已將 ${w.name} 補上`)
                    }}
                  >
                    補上
                  </Button>
                ) : (
                  <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                    已補上
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
