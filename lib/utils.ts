import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInDays, format, parseISO } from "date-fns";
import type { BillingPeriod, Member, MemberStatus } from "@/types/supabase";

const BILLING_PERIODS: BillingPeriod[] = ["monthly", "three_months", "six_months", "yearly"];

function normalizeBillingPeriod(raw: unknown): BillingPeriod {
  const s = String(raw ?? "monthly");
  return BILLING_PERIODS.includes(s as BillingPeriod) ? (s as BillingPeriod) : "monthly";
}

/** Coerce Supabase row (e.g. before migration) to Member. */
export function normalizeMember(row: Record<string, unknown>): Member {
  const r = row as unknown as Member;
  return {
    ...r,
    billing_period: normalizeBillingPeriod(row.billing_period),
    is_first_membership: Boolean(row.is_first_membership ?? true),
    is_inactive: Boolean(row.is_inactive ?? false),
    import_key: row.import_key != null ? Number(row.import_key) : null,
    admission_paid: row.admission_paid != null ? Number(row.admission_paid) : 0,
    amount_paid: row.amount_paid != null ? Number(row.amount_paid) : 0,
  };
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Date-based status only (ignores inactive flag). */
export function getMemberStatus(membershipEnd: string): Exclude<MemberStatus, "inactive" | "paused"> {
  const today = new Date();
  const endDate = parseISO(membershipEnd);
  const daysLeft = differenceInDays(endDate, today);

  if (daysLeft < 0) return "expired";
  if (daysLeft <= 7) return "expiring_soon";
  return "active";
}

/** Full UI status: inactive members show as inactive regardless of dates. */
export function getMemberDisplayStatus(member: Pick<Member, "membership_end" | "is_inactive">): MemberStatus {
  if (member.is_inactive) return "inactive";
  return getMemberStatus(member.membership_end);
}

export function getDaysLeft(membershipEnd: string): number {
  return differenceInDays(parseISO(membershipEnd), new Date());
}

export function formatDate(date: string) {
  return format(parseISO(date), "dd MMM yyyy");
}

export function getMembershipDuration(plan: string, billingPeriod?: BillingPeriod): number {
  if (billingPeriod) {
    const days: Record<BillingPeriod, number> = {
      monthly: 30,
      three_months: 90,
      six_months: 180,
      yearly: 365,
    };
    return days[billingPeriod] ?? 30;
  }
  const durations: Record<string, number> = {
    student: 30,
    general: 30,
  };
  return durations[plan] ?? 30;
}

export function statusColor(status: MemberStatus) {
  return {
    active: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    expired: "text-red-400 bg-red-400/10 border-red-400/20",
    expiring_soon: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    paused: "text-slate-400 bg-slate-400/10 border-slate-400/20",
    inactive: "text-slate-500 bg-slate-500/10 border-slate-500/20",
  }[status];
}

export function planColor(plan: string) {
  return {
    student: "text-sky-400 bg-sky-400/10",
    general: "text-violet-400 bg-violet-400/10",
  }[plan] ?? "text-slate-400 bg-slate-400/10";
}
