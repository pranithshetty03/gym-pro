-- Track admission (₹1000) separately from renewal totals in amount_paid
alter table public.members add column if not exists admission_paid numeric default 0;

update public.members set admission_paid = coalesce(admission_paid, 0);

-- Business rule: assume each existing member paid admission ₹1000 (adjust in Table Editor if needed)
update public.members set admission_paid = 1000 where coalesce(admission_paid, 0) = 0;

-- First-month-only members: their payment was stored entirely in amount_paid as 1000
update public.members
set amount_paid = 0
where coalesce(is_first_membership, true) = true
  and coalesce(amount_paid, 0) = 1000;
