import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowRight, CheckCircle2, GraduationCap, MessageSquareText, Sparkles, Star } from 'lucide-react'
import { toast } from 'sonner'
import { formatHKD, STAGE1_PUBLIC_PRICE, STAGE1_REFERRAL_PRICE, COURSES } from '@/lib/courses'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

export default function Promo() {
  const { code } = useParams()
  const { db, recordPromoView, submitInquiry } = useStore()
  const referrer = db.members.find((m) => m.referralCode === code?.toUpperCase())
  const recorded = useRef(false)

  useEffect(() => {
    if (code && !recorded.current) {
      recorded.current = true
      recordPromoView(code)
    }
  }, [code, recordPromoView])

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const promo = db.promoContent
  const reviews = db.reviews.filter((r) => r.rating >= 4).slice(0, 3)
  const stage1 = COURSES[0]

  if (!referrer) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <GraduationCap className="h-12 w-12 text-amber-400" />
        <h1 className="font-display text-2xl font-bold">呢個推廣連結無效</h1>
        <p className="text-muted-foreground">介紹碼可能已經過期或者輸入有誤。</p>
        <Link to="/"><Button variant="outline" className="gold-border">返回 LegendX 主頁</Button></Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* mini header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 to-amber-600 text-[hsl(222,47%,8%)]">
              <GraduationCap className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-bold">Legend<span className="gold-text">X</span></span>
          </Link>
          <Badge variant="outline" className="gold-border text-amber-300">
            <Sparkles className="mr-1 h-3 w-3" /> 由 {referrer.name} 誠意推薦
          </Badge>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 pb-16 pt-16 text-center sm:px-6">
          <h1 className="font-display text-3xl font-black leading-tight sm:text-5xl">{promo.heroTitle}</h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">{promo.heroSubtitle}</p>

          {/* referral price card */}
          <Card className="gold-border mx-auto mt-10 max-w-md border-2 shadow-[0_0_60px_-15px] shadow-amber-500/30">
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">{stage1.name}（{stage1.format}）</div>
              <div className="mt-3 flex items-end justify-center gap-3">
                <span className="text-lg text-muted-foreground line-through">{formatHKD(STAGE1_PUBLIC_PRICE)}</span>
                <span className="font-display text-4xl font-black gold-text">{formatHKD(STAGE1_REFERRAL_PRICE)}</span>
              </div>
              <div className="mt-1 text-xs font-semibold text-emerald-400">朋友介紹專屬優惠價</div>
              <Link to={`/register?ref=${referrer.referralCode}`}>
                <Button size="lg" className="mt-5 h-12 w-full bg-gradient-to-r from-amber-400 to-amber-600 text-base font-bold text-[hsl(222,47%,8%)] hover:opacity-90">
                  用 {referrer.name} 嘅介紹碼報名 <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <div className="mt-3 text-xs text-muted-foreground">介紹碼 {referrer.referralCode} 會自動帶入</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* selling points */}
      <section className="border-t border-border/40 py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="font-display mb-6 text-center text-2xl font-bold">點解揀 LegendX</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {promo.sellingPoints.map((p) => (
              <div key={p} className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-card/50 p-4 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /> {p}
              </div>
            ))}
          </div>
          <p className="mt-8 rounded-xl border border-border/60 bg-card/50 p-5 text-sm leading-relaxed text-muted-foreground">{promo.aboutText}</p>
        </div>
      </section>

      {/* reviews */}
      {reviews.length > 0 && (
        <section className="border-t border-border/40 py-14">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="font-display mb-6 text-center text-2xl font-bold">學員真實評價</h2>
            <div className="space-y-4">
              {reviews.map((r) => (
                <Card key={r.id} className="border-border/60">
                  <CardContent className="p-5">
                    <div className="mb-2 flex gap-0.5">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed">「{r.comment}」</p>
                    <div className="mt-2 text-xs text-muted-foreground">{r.memberName} · {r.sessionTitle}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* inquiry form */}
      <section className="border-t border-border/40 py-14">
        <div className="mx-auto max-w-xl px-4 sm:px-6">
          <Card className="gold-border">
            <CardContent className="p-6">
              {sent ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-400" />
                  <h3 className="font-display text-xl font-bold">收到你嘅查詢！</h3>
                  <p className="mt-2 text-sm text-muted-foreground">我哋會盡快聯絡你。想即刻報名？</p>
                  <Link to={`/register?ref=${referrer.referralCode}`}>
                    <Button className="mt-4 bg-gradient-to-r from-amber-400 to-amber-600 font-bold text-[hsl(222,47%,8%)]">立即報名</Button>
                  </Link>
                </div>
              ) : (
                <>
                  <h2 className="font-display flex items-center gap-2 text-xl font-bold">
                    <MessageSquareText className="h-5 w-5 text-amber-400" /> 想了解更多？
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">留低你嘅聯絡方法，我哋盡快覆你。</p>
                  <form className="mt-5 space-y-3" onSubmit={(e) => {
                    e.preventDefault()
                    if (!name.trim() || !phone.trim()) { toast.error('請填姓名同電話'); return }
                    submitInquiry({ name, phone, message, referralCode: referrer.referralCode })
                    setSent(true)
                    toast.success('查詢已送出')
                  }}>
                    <Input placeholder="姓名" value={name} onChange={(e) => setName(e.target.value)} />
                    <Input placeholder="電話 / WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    <Textarea placeholder="想問嘅嘢（可選）" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
                    <Button type="submit" className="h-11 w-full bg-gradient-to-r from-amber-400 to-amber-600 font-bold text-[hsl(222,47%,8%)]">送出查詢</Button>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
          <p className="mt-6 text-center text-xs text-muted-foreground">{promo.footerNote}</p>
        </div>
      </section>

      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        © 2026 LegendX 財商教育 · <Link to="/" className="hover:text-amber-300">返回主頁</Link>
      </footer>
    </div>
  )
}
