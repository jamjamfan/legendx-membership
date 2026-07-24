import Link from "next/link";
import {
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  PlugZap,
  QrCode,
  ReceiptText,
  Settings,
  Star,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { signOut } from "@/app/(auth)/actions";

const memberLinks = [
  { href: "/member", label: "學習總覽", icon: LayoutDashboard },
  { href: "/member/courses", label: "我的課程", icon: GraduationCap },
  { href: "/member/orders", label: "我的訂單", icon: ReceiptText },
  { href: "/member/referral", label: "我的介紹", icon: ChartNoAxesCombined },
  { href: "/member/pass", label: "課堂通行證", icon: QrCode },
  { href: "/member/reviews", label: "課後評價", icon: Star },
] as const;

const adminLinks = [
  { href: "/admin", label: "營運總覽", icon: LayoutDashboard },
  { href: "/admin/members", label: "會員", icon: Users },
  { href: "/admin/orders", label: "訂單與退款", icon: ReceiptText },
  { href: "/admin/rebates", label: "獎學金", icon: CircleDollarSign },
  { href: "/admin/inquiries", label: "查詢", icon: ClipboardCheck },
  { href: "/admin/sessions", label: "場次與出席", icon: CalendarDays },
  { href: "/admin/reviews", label: "評價", icon: Star },
  { href: "/admin/announcements", label: "公告", icon: Megaphone },
  { href: "/admin/promo", label: "推廣頁", icon: FileText },
  { href: "/admin/settings", label: "設定", icon: Settings },
  { href: "/admin/integrations", label: "服務狀態", icon: PlugZap },
] as const;

export function PortalShell({
  variant,
  activeHref,
  userName,
  children,
}: {
  variant: "member" | "admin";
  activeHref: string;
  userName: string;
  children: React.ReactNode;
}) {
  const links = variant === "member" ? memberLinks : adminLinks;

  return (
    <div className="portal">
      <aside className="portal-sidebar">
        <Link className="portal-brand" href="/">
          <BrandMark />
        </Link>
        <p className="portal-kicker">
          {variant === "member" ? "MEMBER SPACE" : "OPERATIONS"}
        </p>
        <nav className="portal-nav" aria-label="控制台導覽">
          {links.map((item) => {
            const Icon = item.icon;
            const isActive = activeHref === item.href;
            return (
              <Link
                className={isActive ? "is-active" : undefined}
                href={item.href}
                key={item.href}
              >
                <Icon size={18} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="portal-profile">
          <span className="profile-avatar">
            {variant === "member" ? (
              <UserRound size={17} aria-hidden />
            ) : (
              <WalletCards size={17} aria-hidden />
            )}
          </span>
          <span>
            <strong>{userName}</strong>
            <small>{variant === "member" ? "LegendX 會員" : "管理員"}</small>
          </span>
          <form action={signOut}>
            <button aria-label="登出" type="submit">
              <LogOut size={16} aria-hidden />
            </button>
          </form>
        </div>
      </aside>

      <div className="portal-body">
        <header className="portal-mobile-header">
          <Link href="/">
            <BrandMark />
          </Link>
          <details className="portal-mobile-menu">
            <summary aria-label="開啟控制台導覽">
              <Menu size={20} aria-hidden />
            </summary>
            <nav aria-label="流動版控制台導覽">
              {links.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    className={activeHref === item.href ? "is-active" : undefined}
                    href={item.href}
                    key={item.href}
                  >
                    <Icon size={17} aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </details>
        </header>
        {children}
      </div>
    </div>
  );
}
