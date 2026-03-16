create extension if not exists pgcrypto;

create table if not exists public.learning_rounds (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  child_name text,
  grade_level integer not null default 3 check (grade_level between 1 and 3),
  round_number integer not null check (round_number > 0),
  questions_total integer not null check (questions_total > 0),
  correct_total integer not null check (correct_total >= 0),
  score_percent integer not null check (score_percent >= 0 and score_percent <= 100),
  reward_target integer not null default 95 check (reward_target >= 50 and reward_target <= 100),
  earned_minutes numeric(6,1) not null default 0 check (earned_minutes >= 0),
  reward_unlocked boolean not null default false,
  question_set jsonb not null default '[]'::jsonb
);

alter table public.learning_rounds
add column if not exists reward_target integer not null default 95;

alter table public.learning_rounds
add column if not exists grade_level integer not null default 3;

alter table public.learning_rounds
drop constraint if exists learning_rounds_grade_level_check;

alter table public.learning_rounds
add constraint learning_rounds_grade_level_check
check (grade_level between 1 and 3);

alter table public.learning_rounds
drop constraint if exists learning_rounds_reward_target_check;

alter table public.learning_rounds
add constraint learning_rounds_reward_target_check
check (reward_target >= 50 and reward_target <= 100);

alter table public.learning_rounds
add column if not exists earned_minutes numeric(6,1) not null default 0;

alter table public.learning_rounds
drop constraint if exists learning_rounds_earned_minutes_check;

alter table public.learning_rounds
add constraint learning_rounds_earned_minutes_check
check (earned_minutes >= 0);

alter table public.learning_rounds enable row level security;

drop policy if exists "anon_read_learning_rounds" on public.learning_rounds;
create policy "anon_read_learning_rounds"
on public.learning_rounds
for select
to anon
using (true);

drop policy if exists "anon_insert_learning_rounds" on public.learning_rounds;
create policy "anon_insert_learning_rounds"
on public.learning_rounds
for insert
to anon
with check (true);

create table if not exists public.learning_minute_redemptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  child_name text,
  minutes_redeemed numeric(6,1) not null default 0 check (minutes_redeemed >= 0)
);

alter table public.learning_minute_redemptions
add column if not exists child_name text;

alter table public.learning_minute_redemptions enable row level security;

drop policy if exists "anon_read_learning_redemptions" on public.learning_minute_redemptions;
create policy "anon_read_learning_redemptions"
on public.learning_minute_redemptions
for select
to anon
using (true);

drop policy if exists "anon_insert_learning_redemptions" on public.learning_minute_redemptions;
create policy "anon_insert_learning_redemptions"
on public.learning_minute_redemptions
for insert
to anon
with check (true);
