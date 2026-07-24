import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <article>
        <Link className="auth-back" href="/">
          <ArrowLeft size={14} aria-hidden />
          返回首頁
        </Link>
        <p className="eyebrow">Privacy</p>
        <h1>收集個人資料聲明</h1>
        <p className="legal-updated">草擬版本 · 正式上線前須由營運方及香港法律顧問確認</p>
        <h2>收集目的</h2>
        <p>
          LegendX 會收集姓名、聯絡資料、課程、訂單、付款、出席、查詢及獎學金記錄，用作建立帳戶、處理報名與付款、提供課程、安排通知、處理退款及履行相關營運需要。
        </p>
        <h2>必須及自願提供嘅資料</h2>
        <p>
          報名所需資料會清楚標示為必填。推廣訊息同意屬自願，你拒絕接收推廣不會影響報名或課程服務。
        </p>
        <h2>資料使用及披露</h2>
        <p>
          資料只會向提供服務所需嘅供應商披露，例如託管、身份驗證、付款、電郵及 WhatsApp
          服務。供應商只可按 LegendX 指示處理資料。
        </p>
        <h2>查閱、更正及聯絡</h2>
        <p>
          你可以要求查閱或更正個人資料，亦可以隨時撤回推廣訊息同意。正式聯絡人、電郵及郵寄地址會喺上線前補上。
        </p>
        <h2>保留與安全</h2>
        <p>
          資料只會保留至完成相關用途及法律／會計需要，並以權限控制、加密連線、審計記錄、備份及事故應變程序保護。
        </p>
      </article>
    </main>
  );
}
