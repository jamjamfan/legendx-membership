-- One member can only hold one active order for the same course/stage.
-- The existing checkout function gives a friendly error; this index also
-- closes the concurrent-request race at the database boundary.
create unique index if not exists orders_one_active_course_per_member
on public.orders (member_id, course_id)
where status in (
  'pending_payment',
  'payment_review',
  'paid',
  'refund_requested',
  'refund_processing'
);

update public.courses
set summary =
  '亞洲第一企業家教練 Yesir 鄭凱名博士與 Forbes 福布斯 ESG 企業家・亞洲富爸爸 James Sir 合作打造，將賺錢、理錢、投資、借貸、生活成本、AI 微創業與被動收入，整合成一套屬於自己嘅時間自由系統。'
where stage = 1;

update public.course_sessions
set instructor =
  '亞洲第一企業家教練 Yesir 鄭凱名博士 × James Sir'
where course_id = (
  select id
  from public.courses
  where stage = 1
);
