-- Package period for renewals (after first admission month)
alter table public.members add column if not exists billing_period text default 'monthly';

update public.members set billing_period = coalesce(billing_period, 'monthly');

alter table public.members drop constraint if exists members_billing_period_check;
alter table public.members add constraint members_billing_period_check
  check (billing_period in ('monthly', 'three_months', 'six_months', 'yearly'));
