import { useEffect, useState } from 'react'
import { ExternalLink, Info } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '../../lib/store'
import type { PromoContent } from '../../lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'

export default function AdminPromo() {
  const { db, updatePromoContent } = useStore()
  const [form, setForm] = useState<PromoContent>(db.promoContent)

  useEffect(() => {
    setForm(db.promoContent)
  }, [db.promoContent])

  const setPoint = (index: number, value: string) => {
    const points = [...form.sellingPoints]
    points[index] = value
    setForm({ ...form, sellingPoints: points })
  }

  const save = () => {
    if (!form.heroTitle.trim()) {
      toast.error('請填寫主標題')
      return
    }
    updatePromoContent({
      ...form,
      sellingPoints: form.sellingPoints.map((p) => p.trim()).filter(Boolean),
    })
    toast.success('已儲存推廣頁內容')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">推廣頁管理</h1>
        <p className="text-sm text-muted-foreground">編輯所有會員介紹推廣頁嘅共用內容</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-amber-400" />
            即時生效
          </CardTitle>
          <CardDescription>
            每位會員都有自己嘅推廣頁，網址係 <span className="font-mono text-amber-400">/p/&lt;介紹碼&gt;</span>
            。儲存後所有會員嘅推廣頁會即時更新。
            <a
              href="#/p/GOLD8888"
              target="_blank"
              rel="noreferrer"
              className="ml-2 inline-flex items-center gap-1 text-amber-400 hover:underline"
            >
              預覽示範頁
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">頁面內容</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="promo-hero-title">主標題</Label>
            <Input
              id="promo-hero-title"
              value={form.heroTitle}
              onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="promo-hero-subtitle">副標題</Label>
            <Textarea
              id="promo-hero-subtitle"
              value={form.heroSubtitle}
              onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>賣點（4 點）</Label>
            {[0, 1, 2, 3].map((i) => (
              <Input
                key={i}
                value={form.sellingPoints[i] ?? ''}
                onChange={(e) => setPoint(i, e.target.value)}
                placeholder={`賣點 ${i + 1}`}
              />
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="promo-about">關於 LegendX</Label>
            <Textarea
              id="promo-about"
              value={form.aboutText}
              onChange={(e) => setForm({ ...form, aboutText: e.target.value })}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="promo-footer">頁尾備註</Label>
            <Input
              id="promo-footer"
              value={form.footerNote}
              onChange={(e) => setForm({ ...form, footerNote: e.target.value })}
            />
          </div>
          <Button onClick={save}>儲存變更</Button>
        </CardContent>
      </Card>
    </div>
  )
}
