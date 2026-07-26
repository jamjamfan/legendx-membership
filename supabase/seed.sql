insert into public.courses (
  id,
  stage,
  name,
  title,
  summary,
  base_price_cents,
  referral_price_cents,
  membership_fee_cents
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    1,
    '財技',
    '從財商覺醒，到時間自由',
    '亞洲第一企業家教練 Yesir 鄭凱名博士與 Forbes 福布斯 ESG 企業家・亞洲富爸爸 James Sir 合作打造，將賺錢、理財、投資、借貸、生活成本、AI 微創業及被動收入，整合成一套屬於自己的時間自由系統。',
    98000,
    88000,
    0
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    2,
    '實踐',
    '從方法走向成果',
    '將所學應用於真實處境，透過回饋、練習及同儕支持建立穩定能力。',
    680000,
    null,
    10000
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    3,
    '傳承',
    '成就自己，也成就別人',
    '整合能力、經驗及影響力，將個人成果轉化成可以傳承的價值。',
    380000,
    null,
    0
  )
on conflict (stage) do update set
  name = excluded.name,
  title = excluded.title,
  summary = excluded.summary,
  base_price_cents = excluded.base_price_cents,
  referral_price_cents = excluded.referral_price_cents,
  membership_fee_cents = excluded.membership_fee_cents;

insert into public.course_sessions (
  id,
  course_id,
  title,
  area,
  venue_name,
  full_address,
  instructor,
  capacity,
  status,
  enrollment_opens_at,
  enrollment_closes_at,
  starts_at,
  ends_at
)
values
  (
    'a1111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    '財技 3 班 · 星期五',
    '觀塘',
    '華盛數碼大廈 2303 室',
    '觀塘鴻圖道 33 號華盛數碼大廈 2303 室（港鐵牛頭角站 A 出口）',
    '亞洲第一企業家教練 Yesir 鄭凱名博士 × James Sir',
    30,
    'published',
    '2026-06-01 00:00:00+08',
    '2026-07-24 18:55:00+08',
    '2026-07-24 19:00:00+08',
    '2026-08-07 22:30:00+08'
  ),
  (
    'a1111111-1111-4111-8111-222222222222',
    '11111111-1111-4111-8111-111111111111',
    '財技 4 班 · 星期三',
    '觀塘',
    '華盛數碼大廈 2303 室',
    '觀塘鴻圖道 33 號華盛數碼大廈 2303 室（港鐵牛頭角站 A 出口）',
    '亞洲第一企業家教練 Yesir 鄭凱名博士 × James Sir',
    30,
    'published',
    '2026-06-01 00:00:00+08',
    '2026-08-05 18:55:00+08',
    '2026-08-05 19:00:00+08',
    '2026-08-19 22:30:00+08'
  ),
  (
    'a2222222-2222-4222-8222-222222222222',
    '22222222-2222-4222-8222-222222222222',
    '第二階段 · 9 月實戰班',
    '港島',
    'LegendX Workshop',
    '港島區（付款後顯示完整地址）',
    'LegendX 導師團隊',
    18,
    'published',
    now() - interval '30 days',
    now() + interval '45 days',
    date_trunc('day', now()) + interval '60 days 10 hours',
    date_trunc('day', now()) + interval '74 days 18 hours'
  )
on conflict (id) do update set
  title = excluded.title,
  area = excluded.area,
  venue_name = excluded.venue_name,
  full_address = excluded.full_address,
  instructor = excluded.instructor,
  capacity = excluded.capacity,
  status = excluded.status,
  enrollment_opens_at = excluded.enrollment_opens_at,
  enrollment_closes_at = excluded.enrollment_closes_at,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at;

insert into public.session_lessons (
  session_id,
  title,
  starts_at,
  ends_at,
  position
)
values
  (
    'a1111111-1111-4111-8111-111111111111',
    'Lesson 1 · 為什麼你一直努力，卻沒有時間自由',
    '2026-07-24 19:00:00+08',
    '2026-07-24 22:30:00+08',
    1
  ),
  (
    'a1111111-1111-4111-8111-111111111111',
    'Lesson 2 · 設計你的被動收入藍圖',
    '2026-07-31 19:00:00+08',
    '2026-07-31 22:30:00+08',
    2
  ),
  (
    'a1111111-1111-4111-8111-111111111111',
    'Lesson 3 · HK$30,000 被動收入路線圖',
    '2026-08-07 19:00:00+08',
    '2026-08-07 22:30:00+08',
    3
  ),
  (
    'a1111111-1111-4111-8111-222222222222',
    'Lesson 1 · 為什麼你一直努力，卻沒有時間自由',
    '2026-08-05 19:00:00+08',
    '2026-08-05 22:30:00+08',
    1
  ),
  (
    'a1111111-1111-4111-8111-222222222222',
    'Lesson 2 · 設計你的被動收入藍圖',
    '2026-08-12 19:00:00+08',
    '2026-08-12 22:30:00+08',
    2
  ),
  (
    'a1111111-1111-4111-8111-222222222222',
    'Lesson 3 · HK$30,000 被動收入路線圖',
    '2026-08-19 19:00:00+08',
    '2026-08-19 22:30:00+08',
    3
  )
on conflict (session_id, position) do update set
  title = excluded.title,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at;

insert into public.settings (key, value, description)
values
  (
    'scholarship_validity_days',
    '180'::jsonb,
    '獎學金名額由付款日起計的有效日數'
  ),
  (
    'fps_payment_hold_hours',
    '24'::jsonb,
    'FPS／現金待確認訂單保留座位時數'
  ),
  (
    'stripe_payment_hold_minutes',
    '30'::jsonb,
    'Stripe checkout 保留座位分鐘'
  )
on conflict (key) do update set
  value = excluded.value,
  description = excluded.description;

insert into public.promo_content (
  version,
  status,
  headline,
  subheadline,
  benefits,
  brand_story,
  published_at
)
values (
  2,
  'published',
  '從財商覺醒，到時間自由',
  '將賺錢、理財、投資、借貸、生活成本、AI 微創業及被動收入，整合成一套屬於你的系統。',
  '["建立時間自由系統", "拆解 HK$30,000 規劃目標", "用 AI 微創業開拓收入可能"]'::jsonb,
  '並非毋須工作，亦非即時退休；而是逐步讓收入不再完全依賴每日上班。',
  now()
)
on conflict (version) do update set
  status = excluded.status,
  headline = excluded.headline,
  subheadline = excluded.subheadline,
  benefits = excluded.benefits,
  brand_story = excluded.brand_story,
  published_at = excluded.published_at;
