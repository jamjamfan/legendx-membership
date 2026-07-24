export type CourseStage = 1 | 2 | 3;

export interface CourseDefinition {
  stage: CourseStage;
  name: string;
  title: string;
  summary: string;
  price: number;
  referralPrice?: number;
  membershipFee?: number;
  outcomes: readonly string[];
  format?: string;
  faculty?: readonly string[];
  lessons?: readonly {
    title: string;
    focus: string;
    items: readonly string[];
  }[];
}

export const STAGE_ONE_VENUE =
  "觀塘鴻圖道 33 號華盛數碼大廈 2303 室";
export const STAGE_ONE_TRANSIT = "港鐵牛頭角站 A 出口";
export const STAGE_ONE_WHATSAPP_URL =
  "https://api.whatsapp.com/send?phone=85264939468&text=2026%E8%B2%A1%E6%8A%80%E7%8F%AD%E6%88%91%E8%A6%81%E5%A0%B1%E5%90%8D";

export const courses: readonly CourseDefinition[] = [
  {
    stage: 1,
    name: "財技",
    title: "從財商覺醒，到時間自由",
    summary:
      "Yesir 鄭凱名與 Forbes 福布斯 ESG 企業家・亞洲富爸爸 James Sir 合作打造，將賺錢、理錢、投資、借貸、生活成本、AI 微創業與被動收入，整合成一套屬於你嘅時間自由系統。",
    price: 980,
    referralPrice: 880,
    format: "線下課堂 · 三晚 × 3.5 小時 · 19:00–22:30",
    faculty: [
      "亞洲第一企業家教練 Yesir 鄭凱名",
      "Forbes 福布斯 ESG 企業家・亞洲富爸爸 James Sir",
    ],
    outcomes: [
      "建立自己嘅時間自由系統圖",
      "拆解每月 HK$30,000 被動收入目標",
      "完成可計算、可逐步驗證嘅收入藍圖",
    ],
    lessons: [
      {
        title: "為什麼你一直努力，卻沒有時間自由",
        focus: "Lesson 1 · 由起步到收入自由",
        items: [
          "【穩・流・爆・快】由起步到收入自由嘅基礎",
          "拆解較穩健財技工具嘅風險、限制與適用情境",
          "理解時間自由點解可能比想像中更近",
          "以每月 HK$30,000 為目標，建立可計算嘅被動收入方向",
          "經營心態、投資心理與決策習慣",
        ],
      },
      {
        title: "財技公式：設計你的被動收入藍圖",
        focus: "Lesson 2 · F.I.R.E. 與第一個現金流目標",
        items: [
          "F.I.R.E. 賺錢及投資財技公式",
          "設計屬於你嘅被動收入藍圖",
          "運用理財工具，規劃第一個 HK$10,000 被動收入目標",
          "練習贏家 10% 逆向思維",
          "修正自己面對金錢時嘅思維與行動模式",
        ],
      },
      {
        title: "把 HK$30,000 目標拆成一條可以行嘅路線",
        focus: "Lesson 3 · AI 微創業、旅居與五種金錢能力",
        items: [
          "認識 AI 微創業與無國界藍海市場",
          "填寫你嘅優悠白書，認識不同國家旅居玩法",
          "用智慧修行，覺醒如何賺錢、變錢、省錢、花錢、理錢",
        ],
      },
    ],
  },
  {
    stage: 2,
    name: "實踐",
    title: "由方法，行到成果",
    summary: "將所學落到真實處境，用回饋、練習同同儕支持建立穩定能力。",
    price: 6800,
    membershipFee: 100,
    outcomes: ["進階實戰訓練", "導師回饋修正", "解鎖 3 個獎學金名額"],
  },
  {
    stage: 3,
    name: "傳承",
    title: "成就自己，也成就別人",
    summary: "整合能力、經驗同影響力，將個人成果轉化成可以傳承嘅價值。",
    price: 3800,
    outcomes: ["整合個人方法", "建立傳承路線", "再解鎖 2 個獎學金名額"],
  },
] as const;

export function formatHkd(amount: number): string {
  return new Intl.NumberFormat("zh-HK", {
    style: "currency",
    currency: "HKD",
    maximumFractionDigits: 0,
  }).format(amount);
}
