import Link from "next/link";
import { Menu } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const navigation = [
  { href: "#programme", label: "三階段課程" },
  { href: "#scholarship", label: "獎學金計劃" },
  { href: "#experience", label: "會員體驗" },
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell nav-row">
        <Link href="/" aria-label="LegendX 首頁">
          <BrandMark />
        </Link>

        <nav className="desktop-nav" aria-label="主要導覽">
          {navigation.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href="/login" className="nav-login">
            會員登入
          </Link>
        </nav>

        <details className="mobile-nav">
          <summary aria-label="開啟導覽選單">
            <Menu size={19} aria-hidden />
          </summary>
          <nav className="mobile-nav-panel" aria-label="流動版導覽">
            {navigation.map((item) => (
              <Link href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
            <Link href="/login">會員登入</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
