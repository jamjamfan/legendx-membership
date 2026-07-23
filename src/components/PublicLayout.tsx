import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { GraduationCap, LogOut, LayoutDashboard, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'

export default function PublicLayout() {
  const { currentMember, logout } = useStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = [
    { id: 'courses', label: '課程' },
    { id: 'scholarship', label: '獎學金計劃' },
    { id: 'reviews', label: '學員評價' },
  ]

  const goSection = (id: string) => {
    setMenuOpen(false)
    navigate('/')
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 to-amber-600 text-[hsl(222,47%,8%)]">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-bold tracking-wide">
              Legend<span className="gold-text">X</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {navItems.map((n) => (
              <button key={n.label} onClick={() => goSection(n.id)} className="text-sm text-muted-foreground transition-colors hover:text-amber-300">
                {n.label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {currentMember ? (
              <>
                {currentMember.isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
                    <LayoutDashboard className="mr-1.5 h-4 w-4" /> 管理後台
                  </Button>
                )}
                <Button variant="outline" size="sm" className="gold-border" onClick={() => navigate('/member')}>
                  {currentMember.name} · 會員中心
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/') }}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>登入</Button>
                <Button size="sm" className="bg-gradient-to-r from-amber-400 to-amber-600 font-semibold text-[hsl(222,47%,8%)] hover:opacity-90" onClick={() => navigate('/register')}>
                  免費註冊
                </Button>
              </>
            )}
          </div>

          <button className="md:hidden text-foreground" onClick={() => setMenuOpen(!menuOpen)} aria-label="選單">
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-border/60 bg-background px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              {navItems.map((n) => (
                <button key={n.label} onClick={() => goSection(n.id)} className="text-left text-sm text-muted-foreground">
                  {n.label}
                </button>
              ))}
              <div className="mt-2 flex gap-2">
                {currentMember ? (
                  <>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setMenuOpen(false); navigate('/member') }}>會員中心</Button>
                    <Button variant="ghost" size="sm" onClick={() => { logout(); setMenuOpen(false); navigate('/') }}>登出</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setMenuOpen(false); navigate('/login') }}>登入</Button>
                    <Button size="sm" className="flex-1 bg-gradient-to-r from-amber-400 to-amber-600 text-[hsl(222,47%,8%)]" onClick={() => { setMenuOpen(false); navigate('/register') }}>免費註冊</Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border/60 bg-[hsl(222,47%,5%)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 to-amber-600 text-[hsl(222,47%,8%)]">
                <GraduationCap className="h-4 w-4" />
              </span>
              <span className="font-display text-lg font-bold">LegendX</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              實戰財商教育：黃金 EA、房地產、財商思維。由三晚基礎班到一年落地陪跑計劃。
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-amber-300">課程</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link className="hover:text-amber-300" to="/course/1">第一階段 · 財商基礎班</Link></li>
              <li><Link className="hover:text-amber-300" to="/course/2">第二階段 · 進階實戰班</Link></li>
              <li><Link className="hover:text-amber-300" to="/course/3">第三階段 · 一年落地計劃</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-amber-300">聯絡</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>尖沙咀加連威老道 2–6 號</li>
              <li>愛賓商業大廈 12 樓全層</li>
              <li><NavLink className="hover:text-amber-300" to="/login">管理員入口</NavLink></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
          © 2026 LegendX 財商教育 · Phase 1 示範系統
        </div>
      </footer>
    </div>
  )
}
