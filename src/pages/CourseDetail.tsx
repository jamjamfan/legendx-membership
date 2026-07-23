import { useNavigate, useParams } from 'react-router'
import { ArrowLeft, CalendarDays, CheckCircle2, Clock, MapPin, MessageCircle, Users } from 'lucide-react'
import { formatHKD, getCourse, priceItems, totalOf, STAGE1_REFERRAL_PRICE, VENUE_AREA, WHATSAPP_URL } from '@/lib/courses'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { CourseStage } from '@/lib/types'

export default function CourseDetail() {
  const { stage: stageParam } = useParams()
  const navigate = useNavigate()
  const { db, currentMember } = useStore()
  const stage = Number(stageParam) as CourseStage
  const course = getCourse(stage)
  const items = priceItems(stage, false)
  const sessions = db.sessions.filter((s) => s.stage === stage)

  const enrolledCount = (sessionId: string) =>
    db.orders.filter((o) => o.sessionId === sessionId && ['pending', 'paid', 'refund_review'].includes(o.status)).length

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-amber-300">
        <ArrowLeft className="h-4 w-4" /> 返回
      </button>

      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          {stage === 1 && (
            <img
              src={`${import.meta.env.BASE_URL}poster-stage1.jpg`}
              alt="LegendX 財技班課程海報"
              className="mb-8 w-full max-w-md rounded-xl border border-amber-500/30 shadow-[0_0_50px_-12px] shadow-amber-500/25"
            />
          )}
          <div className="text-xs font-semibold tracking-widest text-amber-400">{course.code}</div>
          <h1 className="font-display mt-2 text-3xl font-black sm:text-4xl">{course.name}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{course.tagline}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {course.topics.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
          </div>
          <p className="mt-6 leading-relaxed text-foreground/90">{course.description}</p>

          <h2 className="font-display mt-10 mb-4 text-xl font-bold">課程重點</h2>
          <ul className="space-y-2.5">
            {course.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {h}
              </li>
            ))}
          </ul>

          {course.lessons && (
            <>
              <h2 className="font-display mb-4 mt-10 text-xl font-bold">三晚課程大綱</h2>
              <div className="space-y-4">
                {course.lessons.map((l, li) => (
                  <Card key={l.title} className="gold-border">
                    <CardContent className="p-5">
                      <div className="mb-3 flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-xs font-black text-[hsl(222,47%,8%)]">
                          {li + 1}
                        </span>
                        <h3 className="text-sm font-bold text-amber-200">{l.title}</h3>
                      </div>
                      <ul className="space-y-2">
                        {l.items.map((item) => (
                          <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/90">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/70" /> {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          <h2 className="font-display mb-4 mt-10 text-xl font-bold">開課場次</h2>
          <div className="space-y-3">
            {sessions.length === 0 && <p className="text-sm text-muted-foreground">場次即將公布。</p>}
            {sessions.map((s) => {
              const enrolled = enrolledCount(s.id)
              const full = enrolled >= s.capacity
              return (
                <Card key={s.id} className="border-border/60">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <div className="font-semibold">{s.title}</div>
                      <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-amber-400/70" />{s.dates.join('、')}</div>
                        <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-400/70" />{s.time}</div>
                        <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-amber-400/70" />{currentMember ? s.venue : `${VENUE_AREA}（詳細地址報名後公布）`}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className={full ? 'border-orange-500/40 text-orange-400' : 'border-emerald-500/40 text-emerald-400'}>
                      <Users className="mr-1 h-3 w-3" />{full ? '已滿額' : `剩 ${s.capacity - enrolled} 位`}
                    </Badge>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Price card */}
        <div className="lg:sticky lg:top-24 h-fit">
          <Card className="gold-border border-2">
            <CardContent className="p-6">
              <h3 className="font-display mb-4 text-lg font-bold">課程費用</h3>
              <div className="space-y-2.5">
                {items.map((i) => (
                  <div key={i.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{i.label}</span>
                    <span className="font-semibold">{formatHKD(i.amount)}</span>
                  </div>
                ))}
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="font-semibold">合計</span>
                  <span className="font-display text-2xl font-black text-amber-300">{formatHKD(totalOf(items))}</span>
                </div>
              </div>
              {stage === 1 && (
                <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs leading-relaxed text-emerald-300">
                  有朋友介紹碼？報名時輸入即享介紹價 <b>{formatHKD(STAGE1_REFERRAL_PRICE)}</b>
                </div>
              )}
              <Button className="mt-6 h-11 w-full bg-gradient-to-r from-amber-400 to-amber-600 font-bold text-[hsl(222,47%,8%)] hover:opacity-90" onClick={() => navigate(`/checkout/${stage}`)}>
                立即報名
              </Button>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="mt-2 block">
                <Button variant="outline" className="h-11 w-full border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10">
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp 留位
                </Button>
              </a>
              <p className="mt-3 text-center text-xs text-muted-foreground">小班教學 · 名額有限</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
