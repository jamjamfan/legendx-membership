import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { GraduationCap, MailCheck, UserPlus } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Register() {
  const { register, mode, sendLoginCode, verifyLoginCode, findMemberByCode } = useStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const refFromUrl = params.get('ref')?.toUpperCase() ?? ''

  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', referralCode: refFromUrl })
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'form' | 'code'>('form')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [k]: e.target.value })
    setError('')
  }

  const goNext = () => {
    // 推薦漏斗：經介紹碼註冊 → 直接落入第一階段報名頁，一氣呵成
    navigate(form.referralCode.trim() ? '/checkout/1' : '/member')
  }

  // 示範模式：密碼註冊（原有流程）
  const submitDemo = (e: React.FormEvent) => {
    e.preventDefault()
    const r = register(form)
    if (r.ok) goNext()
    else setError(r.error ?? '註冊失敗')
  }

  // 雲端模式：填表 → 發登入碼 → 驗證 → 建立 profile
  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('請填姓名'); return }
    if (!form.phone.trim()) { setError('請填電話 / WhatsApp'); return }
    if (form.referralCode.trim() && !findMemberByCode(form.referralCode)) {
      setError('介紹碼無效，請檢查清楚（冇介紹碼可以留空）')
      return
    }
    setBusy(true)
    const r = await sendLoginCode(form.email)
    setBusy(false)
    if (r.ok) setStep('code')
    else setError(r.error ?? '發送失敗')
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const r = await verifyLoginCode(form.email, code, {
      name: form.name,
      phone: form.phone,
      referralCode: form.referralCode || undefined,
    })
    setBusy(false)
    if (r.ok) goNext()
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
            <h1 className="font-display text-2xl font-bold">免費註冊</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === 'cloud' ? '一分鐘開戶，唔使密碼' : '一分鐘開戶，即刻報名課程'}
            </p>
          </div>

          {mode === 'demo' ? (
            <form className="space-y-4" onSubmit={submitDemo}>
              <div className="space-y-1.5">
                <Label>姓名</Label>
                <Input placeholder="陳大文" value={form.name} onChange={set('name')} required />
              </div>
              <div className="space-y-1.5">
                <Label>電話 / WhatsApp</Label>
                <Input placeholder="9123 4567" value={form.phone} onChange={set('phone')} required />
              </div>
              <div className="space-y-1.5">
                <Label>電郵</Label>
                <Input type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
              </div>
              <div className="space-y-1.5">
                <Label>密碼</Label>
                <Input type="password" placeholder="最少 6 位" value={form.password} onChange={set('password')} required minLength={6} />
              </div>
              <div className="space-y-1.5">
                <Label>介紹碼（可選）</Label>
                <Input placeholder="例如 GOLD8888" value={form.referralCode} onChange={set('referralCode')} />
                {form.referralCode && <p className="text-xs text-emerald-400">用介紹碼報讀第一階段可享 HK$880 優惠價</p>}
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" className="h-11 w-full bg-gradient-to-r from-amber-400 to-amber-600 font-bold text-[hsl(222,47%,8%)]">
                <UserPlus className="mr-2 h-4 w-4" /> 建立帳戶
              </Button>
            </form>
          ) : step === 'form' ? (
            <form className="space-y-4" onSubmit={sendCode}>
              <div className="space-y-1.5">
                <Label>姓名</Label>
                <Input placeholder="陳大文" value={form.name} onChange={set('name')} required />
              </div>
              <div className="space-y-1.5">
                <Label>電話 / WhatsApp</Label>
                <Input placeholder="9123 4567" value={form.phone} onChange={set('phone')} required />
              </div>
              <div className="space-y-1.5">
                <Label>電郵</Label>
                <Input type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
              </div>
              <div className="space-y-1.5">
                <Label>介紹碼（可選）</Label>
                <Input placeholder="例如 GOLD8888" value={form.referralCode} onChange={set('referralCode')} />
                {form.referralCode && <p className="text-xs text-emerald-400">用介紹碼報讀第一階段可享 HK$880 優惠價</p>}
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" disabled={busy} className="h-11 w-full bg-gradient-to-r from-amber-400 to-amber-600 font-bold text-[hsl(222,47%,8%)]">
                <MailCheck className="mr-2 h-4 w-4" /> {busy ? '發送緊…' : '發送登入碼'}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={verify}>
              <p className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
                登入電郵已經發送咗去 <b className="text-amber-300">{form.email}</b>。<br />
                👉 最簡單：<b className="text-amber-300">撳 email 入面條連結</b>，就會自動完成註冊兼登入。<br />
                （將 email 入面嘅登入碼喺下面輸入都得。）
              </p>
              <div className="space-y-1.5">
                <Label>登入碼（如適用）</Label>
                <Input inputMode="numeric" maxLength={8} placeholder="12345678" value={code} onChange={(e) => { setCode(e.target.value); setError('') }} className="text-center text-lg tracking-[0.5em]" />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" disabled={busy} className="h-11 w-full bg-gradient-to-r from-amber-400 to-amber-600 font-bold text-[hsl(222,47%,8%)]">
                <UserPlus className="mr-2 h-4 w-4" /> {busy ? '建立緊…' : '建立帳戶'}
              </Button>
              <button type="button" onClick={() => { setStep('form'); setCode(''); setError('') }} className="w-full text-center text-xs text-muted-foreground hover:text-amber-300">
                返回修改資料 / 重發登入碼
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            已有帳戶？<Link to="/login" className="font-semibold text-amber-300 hover:underline">登入</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
