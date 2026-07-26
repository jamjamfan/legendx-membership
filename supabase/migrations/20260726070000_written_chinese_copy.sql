update public.courses
set
  title = '從財商覺醒，到時間自由',
  summary = '亞洲第一企業家教練 Yesir 鄭凱名博士與 Forbes 福布斯 ESG 企業家・亞洲富爸爸 James Sir 合作打造，將賺錢、理財、投資、借貸、生活成本、AI 微創業及被動收入，整合成一套屬於自己的時間自由系統。',
  updated_at = now()
where stage = 1;

update public.courses
set
  title = '從方法走向成果',
  summary = '將所學應用於真實處境，透過回饋、練習及同儕支持建立穩定能力。',
  updated_at = now()
where stage = 2;

update public.courses
set
  title = '成就自己，也成就別人',
  summary = '整合能力、經驗及影響力，將個人成果轉化成可以傳承的價值。',
  updated_at = now()
where stage = 3;

update public.promo_content
set
  headline = '從財商覺醒，到時間自由',
  subheadline = '將賺錢、理財、投資、借貸、生活成本、AI 微創業及被動收入，整合成一套屬於你的系統。',
  benefits = '["建立時間自由系統", "拆解 HK$30,000 規劃目標", "用 AI 微創業開拓收入可能"]'::jsonb,
  brand_story = '並非毋須工作，亦非即時退休；而是逐步讓收入不再完全依賴每日上班。',
  updated_at = now()
where status = 'published';

update public.settings
set
  description = '獎學金名額由付款日起計的有效日數',
  updated_at = now()
where key = 'scholarship_validity_days';
