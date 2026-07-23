import { useState } from 'react'
import { Megaphone, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '../../lib/store'
import { formatDate } from '../../lib/courses'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'

export default function AdminAnnouncements() {
  const { db, sendAnnouncement } = useStore()
  const [target, setTarget] = useState('all')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const send = () => {
    if (!title.trim()) {
      toast.error('請填寫公告標題')
      return
    }
    if (!body.trim()) {
      toast.error('請填寫公告內容')
      return
    }
    sendAnnouncement({ sessionId: target === 'all' ? undefined : target, title, body })
    toast.success('已記錄（Phase 2 會真正發送）')
    setTitle('')
    setBody('')
    setTarget('all')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">群發公告</h1>
        <p className="text-sm text-muted-foreground">向全部學員或指定場次發送公告</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">撰寫公告</CardTitle>
          <CardDescription>Phase 1 會先記錄公告；Phase 2 先會真正發送通知。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>發送對象</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className="max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部學員</SelectItem>
                {db.sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ann-title">標題</Label>
            <Input
              id="ann-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：開課溫馨提示"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ann-body">內容</Label>
            <Textarea
              id="ann-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="公告內容…"
              rows={5}
            />
          </div>
          <Button onClick={send}>
            <Send className="mr-2 h-4 w-4" />
            發送公告
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">發送紀錄（{db.announcements.length}）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {db.announcements.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">暫時冇公告紀錄</p>
          )}
          {db.announcements.map((a) => (
            <div key={a.id} className="rounded-md border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-amber-400" />
                  <span className="font-medium">{a.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-border">
                    {a.sessionLabel}
                  </Badge>
                  <Badge variant="outline" className="bg-sky-500/15 text-sky-400 border-sky-500/30">
                    已記錄
                  </Badge>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{a.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">{formatDate(a.createdAt)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
