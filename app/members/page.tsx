"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/components/layout/AuthProvider";
import { supabase } from "@/lib/supabase";
import { getMemberStatus, formatDate, statusColor, planColor } from "@/lib/utils";
import { Member } from "@/types/supabase";
import { Search, Plus, Filter, ChevronRight, Phone, Mail } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function MembersPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState(filterParam ?? "all");

  const fetchMembers = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("members")
      .select("*")
      .eq("trainer_id", user.uid)
      .order("name");
    if (data) setMembers(data as Member[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const filtered = members.filter((m) => {
    const status = getMemberStatus(m.membership_end);
    const matchesSearch =
      search === "" ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === "all" || m.membership_plan === planFilter;
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl tracking-widest">MEMBERS</h1>
            <p className="text-muted-foreground text-sm mt-1">{members.length} total members</p>
          </div>
          <Link
            href="/members/new"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone or email..."
              className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Plans</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half-yearly">Half-Yearly</option>
              <option value="annual">Annual</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {/* Members Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-44 bg-card border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border rounded-xl">
            <Filter className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No members found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((member) => {
              const status = getMemberStatus(member.membership_end);
              return (
                <Link
                  key={member.id}
                  href={`/members/${member.id}`}
                  className="group bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-lg">
                        {member.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{member.name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${statusColor(status)}`}>
                          {status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>

                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3" /> {member.phone}
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3" /> {member.email}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <span className={`text-[10px] px-2 py-1 rounded-md font-medium capitalize ${planColor(member.membership_plan)}`}>
                      {member.membership_plan}
                    </span>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Expires</p>
                      <p className="text-xs font-medium text-foreground">{formatDate(member.membership_end)}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function MembersPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="space-y-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="h-24 bg-card border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        </DashboardLayout>
      }
    >
      <MembersPageContent />
    </Suspense>
  );
}
