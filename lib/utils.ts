import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInDays, format, parseISO } from "date-fns";
import { MemberStatus } from "@/types/supabase";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getMemberStatus(membershipEnd: string): MemberStatus {
  const today = new Date();
  const endDate = parseISO(membershipEnd);
  const daysLeft = differenceInDays(endDate, today);

  if (daysLeft < 0) return "expired";
  if (daysLeft <= 7) return "expiring_soon";
  return "active";
}

export function getDaysLeft(membershipEnd: string): number {
  return differenceInDays(parseISO(membershipEnd), new Date());
}

export function formatDate(date: string) {
  return format(parseISO(date), "dd MMM yyyy");
}

export function getMembershipDuration(plan: string): number {
  const durations: Record<string, number> = {
    monthly: 30,
    quarterly: 90,
    "half-yearly": 180,
    annual: 365,
  };
  return durations[plan] ?? 30;
}

export function statusColor(status: MemberStatus) {
  return {
    active: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    expired: "text-red-400 bg-red-400/10 border-red-400/20",
    expiring_soon: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    paused: "text-slate-400 bg-slate-400/10 border-slate-400/20",
  }[status];
}

export function planColor(plan: string) {
  return {
    monthly: "text-sky-400 bg-sky-400/10",
    quarterly: "text-violet-400 bg-violet-400/10",
    "half-yearly": "text-pink-400 bg-pink-400/10",
    annual: "text-amber-400 bg-amber-400/10",
  }[plan] ?? "text-slate-400 bg-slate-400/10";
}
