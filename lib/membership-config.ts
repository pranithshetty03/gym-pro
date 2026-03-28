import type { BillingPeriod, MembershipPlan } from "@/types/supabase";

/** One-time admission fee (General & Student) — The Fitness Garage rate card */
export const ADMISSION_FEE = 1000;

/** @deprecated use ADMISSION_FEE */
export const JOIN_FEE_FIRST_MONTH = ADMISSION_FEE;

/**
 * Renewal / package prices after the first month (admission).
 * Source: The Fitness Garage rate card.
 */
export const PACKAGE_PRICES: Record<MembershipPlan, Record<BillingPeriod, number>> = {
  general: {
    monthly: 700,
    three_months: 1800,
    six_months: 3500,
    yearly: 6500,
  },
  student: {
    monthly: 600,
    three_months: 1500,
    six_months: 2800,
    yearly: 5500,
  },
};

export const BILLING_PERIOD_LABEL: Record<BillingPeriod, string> = {
  monthly: "Monthly",
  three_months: "3 months",
  six_months: "6 months",
  yearly: "Yearly",
};

/** Days covered by each package when renewing (after first admission month). */
export const BILLING_PERIOD_DAYS: Record<BillingPeriod, number> = {
  monthly: 30,
  three_months: 90,
  six_months: 180,
  yearly: 365,
};

/** First membership window after signup: one month, admission ₹1000 */
export const FIRST_PERIOD_DAYS = 30;

export const DEFAULT_MEMBERSHIP_DAYS = FIRST_PERIOD_DAYS;

export const PLAN_LABEL: Record<MembershipPlan, string> = {
  student: "Student",
  general: "General",
};

/** Renewal amount for the selected plan + billing period (not admission). */
export function renewalAmount(plan: MembershipPlan, period: BillingPeriod): number {
  return PACKAGE_PRICES[plan][period];
}

/** @deprecated use renewalAmount(plan, period) */
export function renewalAmountForPlan(plan: MembershipPlan): number {
  return PACKAGE_PRICES[plan].monthly;
}

export function addMembershipDays(start: Date, days: number): Date {
  const d = new Date(start);
  d.setDate(d.getDate() + days);
  return d;
}
