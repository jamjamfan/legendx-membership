import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { GraduationCap, UserPlus } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Register() {
  const { register } = useStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const refFromUrl = params.get('ref')?.toUpperCase() ?? ''

  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', referralCode: refFromUrl })
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [k]: e.target.value })
    setError('')
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
            <p className="mt-1 text-sm text-muted-foreground">一分鐘開戶，即刻報名課程</p>
          </div>

          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault()
            const r = register(form)
            if (r.ok) {
              // 推薦漏斗：經介紹碼註冊 → 直接落入第一階段報名頁，一氣呵成
              navigate(form.referralCode.trim() ? '/checkout/1' : '/member')
            } else setError(r.error ?? '註冊失敗')
          }}>
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

          <p className="mt-5 text-center text-sm text-muted-foreground">
            已有帳戶？<Link to="/login" className="font-semibold text-amber-300 hover:underline">登入</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
