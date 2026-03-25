"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/components/layout/AuthProvider";
import { supabase } from "@/lib/supabase";
import { getMemberStatus, formatDate, statusColor, planColor } from "@/lib/utils";
import { Member } from "@/types/supabase";
import {
  Users, TrendingUp, AlertTriangle, CheckCircle2,
  IndianRupee, Bell, ChevronRight, Dumbbell,
} from "lucide-react";
import Link from "next/link";
import { differenceInDays, parseISO } from "date-fns";

function StatCard({
  title, value, icon: Icon, trend, color,
}: { title: string; value: string | number; icon: React.ElementType; trend?: string; color: string }) {
  return (
    <div className={`stat-card bg-card border border-border rounded-xl p-5`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <p className="font-display text-3xl text-foreground tracking-wide">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{title}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchMembers = async () => {
      const { data } = await supabase
        .from("members")
        .select("*")
        .eq("trainer_id", user.uid)
        .order("created_at", { ascending: false });
      if (data) setMembers(data as Member[]);
      setLoading(false);
    };
    fetchMembers();
  }, [user]);

  const activeMembers = members.filter((m) => getMemberStatus(m.membership_end) === "active");
  const expiringSoon = members.filter((m) => getMemberStatus(m.membership_end) === "expiring_soon");
  const expired = members.filter((m) => getMemberStatus(m.membership_end) === "expired");
  const totalRevenue = members.reduce((sum, m) => sum + m.amount_paid, 0);

  const recentActivity = members.slice(0, 5);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-foreground tracking-widest">
              DASHBOARD
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Welcome back, {user?.displayName?.split(" ")[0] ?? "Trainer"}
            </p>
          </div>
          <Link
            href="/members/new"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors glow-orange"
          >
            <Dumbbell className="w-4 h-4" />
            Add Member
          </Link>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-card border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Members"
              value={members.length}
              icon={Users}
              color="bg-primary/20 text-primary"
              trend="All time"
            />
            <StatCard
              title="Active Members"
              value={activeMembers.length}
              icon={CheckCircle2}
              color="bg-emerald-500/20 text-emerald-400"
            />
            <StatCard
              title="Expiring Soon"
              value={expiringSoon.length}
              icon={AlertTriangle}
              color="bg-amber-500/20 text-amber-400"
              trend="≤ 7 days"
            />
            <StatCard
              title="Total Revenue"
              value={`₹${totalRevenue.toLocaleString()}`}
              icon={IndianRupee}
              color="bg-violet-500/20 text-violet-400"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Expiring Soon */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl tracking-widest flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-400" />
                EXPIRING SOON
              </h2>
              <Link href="/reminders" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {expiringSoon.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">
                🎉 No memberships expiring in the next 7 days
              </p>
            ) : (
              <div className="space-y-3">
                {expiringSoon.slice(0, 5).map((member) => {
                  const days = differenceInDays(parseISO(member.membership_end), new Date());
                  return (
                    <Link
                      key={member.id}
                      href={`/members/${member.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center text-sm font-bold text-amber-400 flex-shrink-0">
                        {member.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.phone}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-xs font-mono font-semibold ${days <= 3 ? "text-red-400 pulse-warn" : "text-amber-400"}`}>
                          {days === 0 ? "Today!" : `${days}d left`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(member.membership_end)}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Plan Breakdown */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-display text-xl tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              PLAN BREAKDOWN
            </h2>
            <div className="space-y-3">
              {(["monthly", "quarterly", "half-yearly", "annual"] as const).map((plan) => {
                const count = members.filter((m) => m.membership_plan === plan).length;
                const pct = members.length ? Math.round((count / members.length) * 100) : 0;
                return (
                  <div key={plan}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={`capitalize font-medium ${planColor(plan).split(" ")[0]}`}>{plan.replace("-", " ")}</span>
                      <span className="text-muted-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: plan === "annual" ? "#f59e0b" : plan === "half-yearly" ? "#ec4899" : plan === "quarterly" ? "#a855f7" : "#38bdf8",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expired warning */}
            {expired.length > 0 && (
              <div className="mt-5 p-3 bg-red-400/10 border border-red-400/20 rounded-lg">
                <p className="text-xs text-red-400 font-medium">{expired.length} expired memberships</p>
                <Link href="/members?filter=expired" className="text-[10px] text-red-400/70 hover:text-red-400 underline">
                  Manage renewals →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Members */}
        <div className="bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-display text-xl tracking-widest">RECENT MEMBERS</h2>
            <Link href="/members" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="px-5 py-4 flex gap-3 items-center">
                  <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded animate-pulse w-40" />
                    <div className="h-2 bg-muted rounded animate-pulse w-28" />
                  </div>
                </div>
              ))
            ) : recentActivity.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Dumbbell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No members yet.</p>
                <Link href="/members/new" className="text-primary text-sm hover:underline">
                  Add your first member →
                </Link>
              </div>
            ) : (
              recentActivity.map((member) => {
                const status = getMemberStatus(member.membership_end);
                return (
                  <Link
                    key={member.id}
                    href={`/members/${member.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">
                      {member.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.phone} · {member.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${planColor(member.membership_plan)}`}>
                        {member.membership_plan}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${statusColor(status)}`}>
                        {status.replace("_", " ")}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
