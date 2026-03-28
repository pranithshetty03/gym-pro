-- ============================================================
-- GymPro Trainer Dashboard — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. MEMBERS TABLE
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  trainer_id text not null,
  name text not null,
  email text default '',
  phone text not null,
  photo_url text,
  membership_plan text not null check (membership_plan in ('student', 'general')),
  billing_period text not null default 'monthly' check (billing_period in ('monthly', 'three_months', 'six_months', 'yearly')),
  membership_start date not null,
  membership_end date not null,
  status text default 'active' check (status in ('active', 'expired', 'expiring_soon', 'paused', 'inactive')),
  payment_method text default 'upi' check (payment_method in ('cash', 'upi', 'card', 'bank_transfer')),
  amount_paid numeric default 0,
  admission_paid numeric default 0,
  notes text,
  emergency_contact text,
  is_first_membership boolean default true,
  is_inactive boolean default false,
  import_key integer
);

create unique index if not exists idx_members_trainer_import_key
  on public.members (trainer_id, import_key)
  where import_key is not null;

-- 2. REMINDERS TABLE
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  trainer_id text not null,
  member_id uuid references public.members(id) on delete cascade,
  type text not null check (type in ('expiry', 'payment', 'custom')),
  message text not null,
  scheduled_for timestamptz not null,
  sent boolean default false,
  sent_at timestamptz
);

-- 3. PAYMENTS TABLE
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  trainer_id text not null,
  member_id uuid references public.members(id) on delete set null,
  amount numeric not null,
  method text default 'upi' check (method in ('cash', 'upi', 'card', 'bank_transfer')),
  qr_code_url text,
  upi_id text,
  note text
);

-- ============================================================
-- Row Level Security (RLS)
-- Trainers can only access their own data
-- ============================================================

alter table public.members enable row level security;
alter table public.reminders enable row level security;
alter table public.payments enable row level security;

-- Members policies
create policy "Trainers can view own members"
  on public.members for select
  using (trainer_id = auth.uid()::text);

create policy "Trainers can insert own members"
  on public.members for insert
  with check (trainer_id = auth.uid()::text);

create policy "Trainers can update own members"
  on public.members for update
  using (trainer_id = auth.uid()::text);

create policy "Trainers can delete own members"
  on public.members for delete
  using (trainer_id = auth.uid()::text);

-- Reminders policies
create policy "Trainers can view own reminders"
  on public.reminders for select
  using (trainer_id = auth.uid()::text);

create policy "Trainers can insert own reminders"
  on public.reminders for insert
  with check (trainer_id = auth.uid()::text);

create policy "Trainers can update own reminders"
  on public.reminders for update
  using (trainer_id = auth.uid()::text);

-- Payments policies
create policy "Trainers can view own payments"
  on public.payments for select
  using (trainer_id = auth.uid()::text);

create policy "Trainers can insert own payments"
  on public.payments for insert
  with check (trainer_id = auth.uid()::text);

-- ============================================================
-- Indexes for performance
-- ============================================================

create index if not exists idx_members_trainer_id on public.members(trainer_id);
create index if not exists idx_members_membership_end on public.members(membership_end);
create index if not exists idx_reminders_trainer_id on public.reminders(trainer_id);
create index if not exists idx_payments_trainer_id on public.payments(trainer_id);
