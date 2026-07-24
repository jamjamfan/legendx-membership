import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <main className="legal-page">
      <article>
        <Link className="auth-back" href="/">
          <ArrowLeft size={14} aria-hidden />
          返回首頁
        </Link>
        <p className="eyebrow">Terms</p>
        <h1>服務及報名條款</h1>
        <p className="legal-updated">草擬版本 · 正式上線前須由營運方確認</p>
        <h2>課程報名</h2>
        <p>
          報名以付款確認及場次尚有名額為準。Stripe checkout 會保留座位 30
          分鐘；FPS 及人工收款訂單會保留 24 小時。
        </p>
        <h2>價格與介紹碼</h2>
        <p>
          第一階段標準價為 HK$980，有效介紹碼價格為 HK$880。介紹碼不可自行使用。第二及第三階段不設介紹折扣。
        </p>
        <h2>教育內容與財務風險</h2>
        <p>
          財技班只提供教育及一般資訊，唔構成投資、借貸、稅務或個人財務建議。課堂所用收入數字、案例同路線圖係學習示例，唔代表或保證任何收入、被動收入或投資回報；參加者須按自身情況獨立評估風險，必要時諮詢持牌專業人士。
        </p>
        <h2>獎學金</h2>
        <p>
          付清第二階段可獲三個名額；付清第三階段再獲兩個名額。名額有效期預設
          180
          日。朋友相關訂單退款時，未結算回贈會作廢；已結算回贈會記入負結餘並由下一筆抵扣。
        </p>
        <h2>退款</h2>
        <p>
          會員須於會員中心提交退款原因，由管理員審批。現階段只支援全額退款；實際退款期限、行政費及課程開始後安排須由營運方喺正式上線前定案。
        </p>
        <h2>課堂安排</h2>
        <p>
          LegendX
          可能因導師、場地或不可控制情況調整課堂。任何更改會透過會員中心及已啟用嘅通知渠道發出。
        </p>
      </article>
    </main>
  );
}
