import { Link, NavLink, Navigate, Outlet } from 'react-router'
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  RotateCcw,
  ScanLine,
  Undo2,
  Users,
  FileSliders,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '../../lib/store'
import { Separator } from '../../components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog'

const NAV_ITEMS = [
  { to: '/admin', label: '總覽', icon: LayoutDashboard, end: true },
  { to: '/admin/members', label: '會員', icon: Users },
  { to: '/admin/orders', label: '訂單', icon: ClipboardList },
  { to: '/admin/refunds', label: '退款審批', icon: Undo2 },
  { to: '/admin/rebates', label: '獎學金結算', icon: GraduationCap },
  { to: '/admin/inquiries', label: '查詢名單', icon: MessageSquareText },
  { to: '/admin/sessions', label: '課程場次', icon: CalendarDays },
  { to: '/admin/attendance', label: '出席簽到', icon: ScanLine },
  { to: '/admin/announcements', label: '群發公告', icon: Megaphone },
  { to: '/admin/promo', label: '推廣頁管理', icon: FileSliders },
]

export default function AdminLayout() {
  const { currentMember, resetDemo, authLoading } = useStore()

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">載入中…</div>
  }

  if (!currentMember || !currentMember.isAdmin) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
        <div className="px-5 py-5">
          <div className="text-lg font-bold text-amber-400">LegendX</div>
          <div className="text-xs text-muted-foreground">管理後台</div>
        </div>
        <Separator />
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-amber-500/15 font-medium text-amber-400'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Separator />
        <div className="space-y-2 px-3 py-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <RotateCcw className="h-4 w-4 shrink-0" />
                重置示範數據
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>重置示範數據？</AlertDialogTitle>
                <AlertDialogDescription>
                  所有會員、訂單、回贈、查詢、場次、簽到同公告紀錄都會還原到初始示範狀態，並會登出目前帳戶。此操作不能復原。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    resetDemo()
                    toast.success('已重置示範數據')
                  }}
                >
                  確認重置
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Link
            to="/"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            返回網站
          </Link>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-x-hidden p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}
