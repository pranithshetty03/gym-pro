-- GymPro: student/general plans, first-month flag, inactive flag, import key
-- Run in Supabase SQL Editor after backup.

-- New columns
alter table public.members add column if not exists is_first_membership boolean default true;
alter table public.members add column if not exists is_inactive boolean default false;
alter table public.members add column if not exists import_key integer;

-- Backfill
update public.members set is_first_membership = coalesce(is_first_membership, true);
update public.members set is_inactive = coalesce(is_inactive, false);

-- Migrate legacy plan labels to general (preserve data)
update public.members
set membership_plan = 'general'
where membership_plan in ('monthly', 'quarterly', 'half-yearly', 'annual');

-- Replace check constraint on membership_plan
alter table public.members drop constraint if exists members_membership_plan_check;
alter table public.members add constraint members_membership_plan_check
  check (membership_plan in ('student', 'general'));

-- Optional: widen status column for legacy rows (keep sync with app)
alter table public.members drop constraint if exists members_status_check;
alter table public.members add constraint members_status_check
  check (status in ('active', 'expired', 'expiring_soon', 'paused', 'inactive'));

-- Unique import_key per trainer (nullable allowed multiple times only if null — use partial index)
drop index if exists idx_members_trainer_import_key;
create unique index idx_members_trainer_import_key
  on public.members (trainer_id, import_key)
  where import_key is not null;

-- ============================================================
-- Billing package (monthly / 3mo / 6mo / yearly) — required by app v2 pricing
-- ============================================================
alter table public.members add column if not exists billing_period text default 'monthly';

update public.members set billing_period = coalesce(billing_period, 'monthly');

alter table public.members drop constraint if exists members_billing_period_check;
alter table public.members add constraint members_billing_period_check
  check (billing_period in ('monthly', 'three_months', 'six_months', 'yearly'));

-- Admission fee tracked separately from renewal totals (see 20260328140000_admission_paid.sql)
alter table public.members add column if not exists admission_paid numeric default 0;
