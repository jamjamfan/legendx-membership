import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { GraduationCap, LogIn, MailCheck } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Login() {
  const { login, mode, sendLoginCode, verifyLoginCode } = useStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const next = params.get('next') ?? '/member'

  // ---------- 雲端模式：email 登入碼 ----------
  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const r = await sendLoginCode(email)
    setBusy(false)
    if (r.ok) setStep('code')
    else setError(r.error ?? '發送失敗')
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const r = await verifyLoginCode(email, code)
    setBusy(false)
    if (r.ok) navigate(next)
    else setError(r.error ?? '驗證失敗')
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <Card className="gold-border w-full max-w-md">
        <CardContent className="p-8">
          <div className="mb-6 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-600 text-[hsl(222,47%,8%)]">
              <GraduationCap className="h-6 w-6" />
            </span>
            <h1 className="font-display text-2xl font-bold">會員登入</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === 'cloud' ? '唔使密碼，用電郵登入碼登入' : '登入你嘅 LegendX 帳戶'}
            </p>
          </div>

          {mode === 'cloud' ? (
            step === 'email' ? (
              <form className="space-y-4" onSubmit={sendCode}>
                <div className="space-y-1.5">
                  <Label>電郵</Label>
                  <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} required />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <Button type="submit" disabled={busy} className="h-11 w-full bg-gradient-to-r from-amber-400 to-amber-600 font-bold text-[hsl(222,47%,8%)]">
                  <MailCheck className="mr-2 h-4 w-4" /> {busy ? '發送緊…' : '發送登入碼'}
                </Button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={verify}>
                <p className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
                  登入電郵已經發送咗去 <b className="text-amber-300">{email}</b>。<br />
                  👉 最簡單：<b className="text-amber-300">撳 email 入面條連結</b>，就會自動登入。<br />
                  （如果封 email 有 6 位登入碼，都可以喺下面輸入。）
                </p>
                <div className="space-y-1.5">
                  <Label>6 位登入碼（如適用）</Label>
                  <Input inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={(e) => { setCode(e.target.value); setError('') }} className="text-center text-lg tracking-[0.5em]" />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <Button type="submit" disabled={busy} className="h-11 w-full bg-gradient-to-r from-amber-400 to-amber-600 font-bold text-[hsl(222,47%,8%)]">
                  <LogIn className="mr-2 h-4 w-4" /> {busy ? '驗證緊…' : '登入'}
                </Button>
                <button type="button" onClick={() => { setStep('email'); setCode(''); setError('') }} className="w-full text-center text-xs text-muted-foreground hover:text-amber-300">
                  用返另一個電郵 / 重發登入碼
                </button>
              </form>
            )
          ) : (
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault()
              const r = login(email, password)
              if (r.ok) navigate(next)
              else setError(r.error ?? '登入失敗')
            }}>
              <div className="space-y-1.5">
                <Label>電郵</Label>
                <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} required />
              </div>
              <div className="space-y-1.5">
                <Label>密碼</Label>
                <Input type="password" placeholder="••••••••" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} required />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" className="h-11 w-full bg-gradient-to-r from-amber-400 to-amber-600 font-bold text-[hsl(222,47%,8%)]">
                <LogIn className="mr-2 h-4 w-4" /> 登入
              </Button>
            </form>
          )}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            未有帳戶？<Link to="/register" className="font-semibold text-amber-300 hover:underline">免費註冊</Link>
          </p>

          {mode === 'demo' && (
            <div className="mt-6 rounded-lg border border-border/60 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              <b className="text-amber-300">示範帳戶：</b><br />
              學員：demo@legendx.hk / demo1234（第二階段會員）<br />
              管理員：admin@legendx.hk / admin1234
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
