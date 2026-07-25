import { Navigate, useNavigate } from 'react-router'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { stageLabel } from '@/lib/courses'
import { useStore } from '@/lib/store'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import MyCourses from './MyCourses'
import MyOrders from './MyOrders'
import MyReferral from './MyReferral'

const STAGES = [1, 2, 3]

export default function MemberDashboard() {
  const { currentMember, authLoading } = useStore()
  const navigate = useNavigate()

  if (authLoading) return <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">載入中…</div>
  if (!currentMember) return <Navigate to="/login?next=/member" replace />
  if (currentMember.isAdmin) return <Navigate to="/admin" replace />

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">你好，{currentMember.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">目前階段：{stageLabel(currentMember.stage)}</p>
      </div>

      {/* 階段進度 */}
      <div className="mb-8 grid gap-2 sm:grid-cols-3">
        {STAGES.map((s) => {
          const done = currentMember.stage >= s
          const next = currentMember.stage + 1 === s
          return (
            <div key={s} className={`rounded-xl border p-4 ${done ? 'gold-border bg-amber-500/5' : 'border-border/60'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${done ? 'text-amber-300' : 'text-muted-foreground'}`}>{stageLabel(s)}</span>
                {done && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
              </div>
              {next && (
                <Button size="sm" variant="outline" className="mt-3 gold-border w-full" onClick={() => navigate(`/checkout/${s}`)}>
                  升級報名 <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )
        })}
      </div>

      <Tabs defaultValue="courses">
        <TabsList className="mb-6 grid w-full grid-cols-3">
          <TabsTrigger value="courses">我的課程</TabsTrigger>
          <TabsTrigger value="orders">我的訂單</TabsTrigger>
          <TabsTrigger value="referral">我的介紹</TabsTrigger>
        </TabsList>
        <TabsContent value="courses"><MyCourses /></TabsContent>
        <TabsContent value="orders"><MyOrders /></TabsContent>
        <TabsContent value="referral"><MyReferral /></TabsContent>
      </Tabs>
    </div>
  )
}
