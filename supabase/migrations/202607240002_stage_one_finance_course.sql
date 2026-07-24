-- Refresh the HK$980 Stage 1 course and publish the two confirmed 2026 cohorts.
-- Times are stored as timestamptz with explicit Hong Kong offsets.

insert into public.courses (
  id,
  stage,
  name,
  title,
  summary,
  base_price_cents,
  referral_price_cents,
  membership_fee_cents,
  active
)
values (
  '11111111-1111-4111-8111-111111111111',
  1,
  '財技',
  '從財商覺醒，到時間自由',
  'Yesir 鄭凱名與 Forbes 福布斯 ESG 企業家・亞洲富爸爸 James Sir 合作打造，將賺錢、理錢、投資、借貸、生活成本、AI 微創業與被動收入，整合成一套屬於自己嘅時間自由系統。',
  98000,
  88000,
  0,
  true
)
on conflict (stage) do update set
  name = excluded.name,
  title = excluded.title,
  summary = excluded.summary,
  base_price_cents = excluded.base_price_cents,
  referral_price_cents = excluded.referral_price_cents,
  membership_fee_cents = excluded.membership_fee_cents,
  active = excluded.active;

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
    (select id from public.courses where stage = 1),
    '財技 3 班 · 星期五',
    '觀塘',
    '華盛數碼大廈 2303 室',
    '觀塘鴻圖道 33 號華盛數碼大廈 2303 室（港鐵牛頭角站 A 出口）',
    'Yesir 鄭凱名 × James Sir',
    30,
    'published',
    '2026-06-01 00:00:00+08',
    '2026-07-24 18:55:00+08',
    '2026-07-24 19:00:00+08',
    '2026-08-07 22:30:00+08'
  ),
  (
    'a1111111-1111-4111-8111-222222222222',
    (select id from public.courses where stage = 1),
    '財技 4 班 · 星期三',
    '觀塘',
    '華盛數碼大廈 2303 室',
    '觀塘鴻圖道 33 號華盛數碼大廈 2303 室（港鐵牛頭角站 A 出口）',
    'Yesir 鄭凱名 × James Sir',
    30,
    'published',
    '2026-06-01 00:00:00+08',
    '2026-08-05 18:55:00+08',
    '2026-08-05 19:00:00+08',
    '2026-08-19 22:30:00+08'
  )
on conflict (id) do update set
  course_id = excluded.course_id,
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

update public.promo_content
set status = 'archived'
where status = 'published'
  and version <> 2;

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
  '將賺錢、理錢、投資、借貸、生活成本、AI 微創業同被動收入，砌成一套屬於你嘅系統。',
  '["建立時間自由系統", "拆解 HK$30,000 規劃目標", "用 AI 微創業開拓收入可能"]'::jsonb,
  '唔係唔使工作，亦唔係即時退休；係逐步令收入唔再完全依賴每日上班。',
  now()
)
on conflict (version) do update set
  status = excluded.status,
  headline = excluded.headline,
  subheadline = excluded.subheadline,
  benefits = excluded.benefits,
  brand_story = excluded.brand_story,
  published_at = excluded.published_at;
