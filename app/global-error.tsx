"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="zh-HK">
      <body>
        <main className="order-page">
          <section className="order-confirmation">
            <p className="eyebrow">Something went wrong</p>
            <h1>系統暫時未能完成請求</h1>
            <p>錯誤已記錄。請重新整理；如問題持續，請聯絡 LegendX 團隊。</p>
            <button
              className="button button-dark"
              onClick={() => window.location.reload()}
              type="button"
            >
              重新整理
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
