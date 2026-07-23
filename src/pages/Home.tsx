import { Link, useNavigate } from 'react-router'
import { ArrowRight, BadgeDollarSign, Clock, Gift, MapPin, QrCode, Sparkles, Star, TrendingUp, Users } from 'lucide-react'
import { COURSES, formatHKD, STAGE1_PUBLIC_PRICE, STAGE1_REFERRAL_PRICE } from '@/lib/courses'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

const STAGE_PRICES: Record<number, string> = {
  1: `HK$${STAGE1_PUBLIC_PRICE}`,
  2: 'HK$6,800 + $100 會員費',
  3: 'HK$3,800',
}

export default function Home() {
  const { db, currentMember } = useStore()
  const navigate = useNavigate()
  const reviews = db.reviews.filter((r) => r.rating >= 4).slice(0, 3)
  const memberCount = db.members.filter((m) => !m.isAdmin).length

  return (
    <div>
      {/* ── Hero ─────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[120px]" />
          <div className="absolute right-[-200px] top-40 h-[400px] w-[400px] rounded-full bg-blue-500/10 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-20 text-center sm:px-6 sm:pt-28">
          <Badge variant="outline" className="gold-border mb-6 px-4 py-1.5 text-amber-300">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> 線下實戰財商課程 · 香港
          </Badge>
          <h1 className="font-display mx-auto max-w-4xl text-4xl font-black leading-[1.15] tracking-tight sm:text-6xl">
            學識理財，
            <span className="gold-text">改寫你嘅財務未來</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            黃金 EA · 房地產 · 財商思維 —— 由三晚基礎班，到一年落地陪跑計劃。
            小班教學，真實案例，唔係齋講理論。
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="h-12 bg-gradient-to-r from-amber-400 to-amber-600 px-8 text-base font-bold text-[hsl(222,47%,8%)] shadow-[0_0_40px_-10px] shadow-amber-500/50 hover:opacity-90" onClick={() => navigate('/course/1')}>
              立即報名第一階段 <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base gold-border" onClick={() => document.getElementById('scholarship')?.scrollIntoView({ behavior: 'smooth' })}>
              了解獎學金計劃
            </Button>
          </div>
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-4">
            {[
              { icon: Users, value: `${memberCount}+`, label: '學員會員' },
              { icon: TrendingUp, value: '3 階段', label: '系統化課程' },
              { icon: Gift, value: 'HK$6,800', label: '最高獎學金回贈' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border/60 bg-card/50 px-4 py-5 backdrop-blur">
                <s.icon className="mx-auto mb-2 h-5 w-5 text-amber-400" />
                <div className="font-display text-xl font-bold sm:text-2xl">{s.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Courses ──────────────────────────────── */}
      <section id="courses" className="border-t border-border/40 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-semibold tracking-widest text-amber-400">COURSES</p>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">三個階段，一條完整學習路線</h2>
            <p className="mt-3 text-muted-foreground">由零基礎到落地實戰，逐步升級</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {COURSES.map((c, i) => (
              <Card key={c.stage} className={`group relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 ${i === 1 ? 'gold-border border-2' : 'border-border/60'}`}>
                {i === 1 && (
                  <div className="absolute right-0 top-0 rounded-bl-lg bg-gradient-to-r from-amber-400 to-amber-600 px-3 py-1 text-xs font-bold text-[hsl(222,47%,8%)]">
                    最受歡迎
                  </div>
                )}
                <CardContent className="flex h-full flex-col p-6">
                  <div className="mb-1 text-xs font-semibold tracking-widest text-amber-400">{c.code}</div>
                  <h3 className="font-display text-xl font-bold">{c.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{c.tagline}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {c.topics.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                  <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-400/70" />{c.format}</div>
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-amber-400/70" />尖沙咀（詳細地址報名後公布）</div>
                  </div>
                  <div className="mt-auto pt-6">
                    <div className="mb-4">
                      <span className="font-display text-2xl font-bold text-amber-300">{STAGE_PRICES[c.stage]}</span>
                      {c.stage === 1 && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          介紹價 <span className="font-semibold text-emerald-400">{formatHKD(STAGE1_REFERRAL_PRICE)}</span>
                        </span>
                      )}
                    </div>
                    <Link to={`/course/${c.stage}`}>
                      <Button variant={i === 1 ? 'default' : 'outline'} className={`w-full ${i === 1 ? 'bg-gradient-to-r from-amber-400 to-amber-600 font-semibold text-[hsl(222,47%,8%)] hover:opacity-90' : 'gold-border'}`}>
                        查看詳情 <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Scholarship（只限會員睇詳情） ──────────────── */}
      {currentMember ? (
      <section id="scholarship" className="relative overflow-hidden border-t border-border/40 py-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-150px] top-1/3 h-[350px] w-[350px] rounded-full bg-amber-500/8 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-semibold tracking-widest text-amber-400">SCHOLARSHIP</p>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">介紹朋友獎學金計劃</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              你嘅朋友用你嘅專屬介紹碼報讀第一階段，只需 {formatHKD(STAGE1_REFERRAL_PRICE)}（原價 {formatHKD(STAGE1_PUBLIC_PRICE)}），
              你仲可以賺取獎學金回贈——有機會全數賺返你嘅學費。
            </p>
          </div>

          <div className="mb-10 grid gap-4 md:grid-cols-3">
            {[
              { step: '01', icon: QrCode, title: '攞你嘅專屬連結', desc: '報讀第二或第三階段後，即獲個人推廣頁、介紹碼同 QR 碼，WhatsApp、朋友圈隨便分享。' },
              { step: '02', icon: Users, title: '朋友用碼報名', desc: `朋友經你嘅連結報讀第一階段，即享介紹價 ${formatHKD(STAGE1_REFERRAL_PRICE)}。` },
              { step: '03', icon: BadgeDollarSign, title: '你收獎學金回贈', desc: '朋友付清學費，你嘅獎學金自動記錄，由團隊過數畀你。' },
            ].map((s) => (
              <div key={s.step} className="rounded-xl border border-border/60 bg-card/50 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <s.icon className="h-7 w-7 text-amber-400" />
                  <span className="font-display text-3xl font-black text-amber-500/20">{s.step}</span>
                </div>
                <h3 className="mb-2 font-semibold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="gold-border">
              <CardContent className="p-6">
                <h3 className="font-display mb-1 text-lg font-bold text-amber-300">第二階段會員 · 3 個名額</h3>
                <p className="mb-4 text-sm text-muted-foreground">名額有效期 180 日，用晒即止</p>
                <div className="space-y-3">
                  {[['第 1 個朋友', 1000], ['第 2 個朋友', 2000], ['第 3 個朋友', 3800]].map(([label, amt]) => (
                    <div key={label as string} className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 px-4 py-3">
                      <span className="text-sm">{label}</span>
                      <span className="font-display text-lg font-bold text-amber-300">{formatHKD(amt as number)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-amber-500/15 to-amber-600/10 px-4 py-3">
                    <span className="text-sm font-semibold">合共最高</span>
                    <span className="font-display text-xl font-black gold-text">{formatHKD(6800)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-6">
                <h3 className="font-display mb-1 text-lg font-bold text-amber-300">第三階段會員 · 2 個名額</h3>
                <p className="mb-4 text-sm text-muted-foreground">名額有效期 180 日，用晒即止</p>
                <div className="space-y-3">
                  {[['第 1 個朋友', 1000], ['第 2 個朋友', 2800]].map(([label, amt]) => (
                    <div key={label as string} className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 px-4 py-3">
                      <span className="text-sm">{label}</span>
                      <span className="font-display text-lg font-bold text-amber-300">{formatHKD(amt as number)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-amber-500/15 to-amber-600/10 px-4 py-3">
                    <span className="text-sm font-semibold">合共最高</span>
                    <span className="font-display text-xl font-black gold-text">{formatHKD(3800)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      ) : (
      <section id="scholarship" className="border-t border-border/40 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="mb-2 text-sm font-semibold tracking-widest text-amber-400">MEMBERS ONLY</p>
          <h2 className="font-display text-3xl font-bold sm:text-4xl">會員專屬介紹獎勵計劃</h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted-foreground">
            LegendX 會員享有專屬介紹連結同埋豐富獎勵。詳情只限會員查閱——免費註冊並登入後即可了解。
          </p>
          <Button size="lg" variant="outline" className="mt-8 gold-border" onClick={() => navigate('/register')}>
            免費註冊，了解詳情 <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
      )}
      {reviews.length > 0 && (
        <section id="reviews" className="border-t border-border/40 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-12 text-center">
              <p className="mb-2 text-sm font-semibold tracking-widest text-amber-400">REVIEWS</p>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">學員點講</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {reviews.map((r) => (
                <Card key={r.id} className="border-border/60">
                  <CardContent className="p-6">
                    <div className="mb-3 flex gap-0.5">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="mb-4 text-sm leading-relaxed text-foreground/90">「{r.comment}」</p>
                    <div className="text-xs text-muted-foreground">{r.memberName} · {r.sessionTitle}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Final CTA ────────────────────────────── */}
      <section className="border-t border-border/40 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            準備好開始你嘅<span className="gold-text">財商之旅</span>未？
          </h2>
          <p className="mt-4 text-muted-foreground">第一階段只需 {formatHKD(STAGE1_PUBLIC_PRICE)}，朋友介紹更只需 {formatHKD(STAGE1_REFERRAL_PRICE)}。名額有限，小班教學。</p>
          <Button size="lg" className="mt-8 h-12 bg-gradient-to-r from-amber-400 to-amber-600 px-10 text-base font-bold text-[hsl(222,47%,8%)] shadow-[0_0_40px_-10px] shadow-amber-500/50 hover:opacity-90" onClick={() => navigate('/register')}>
            免費註冊，立即報名 <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </div>
  )
}
