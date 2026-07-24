import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-row">
        <span>© {new Date().getFullYear()} LegendX. 保留所有權利。</span>
        <nav className="footer-links" aria-label="頁尾導覽">
          <Link href="/privacy">私隱政策</Link>
          <Link href="/terms">服務條款</Link>
          <Link href="/login">會員登入</Link>
        </nav>
      </div>
    </footer>
  );
}
