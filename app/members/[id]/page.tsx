"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/components/layout/AuthProvider";
import { supabase } from "@/lib/supabase";
import {
  getMemberDisplayStatus,
  formatDate,
  statusColor,
  planColor,
  getDaysLeft,
  normalizeMember,
} from "@/lib/utils";
import {
  ADMISSION_FEE,
  BILLING_PERIOD_DAYS,
  BILLING_PERIOD_LABEL,
  renewalAmount,
  PLAN_LABEL,
} from "@/lib/membership-config";
import type { BillingPeriod, Member } from "@/types/supabase";
import {
  ArrowLeft, Phone, Mail, Calendar, Bell,
  Trash2, RefreshCw, AlertTriangle, Camera,
  UserX, UserCheck, Pencil, Save,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { addDays, format } from "date-fns";

export default function MemberDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  const { user } = useAuth();
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingDates, setEditingDates] = useState(false);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [savingDates, setSavingDates] = useState(false);
  const [togglingInactive, setTogglingInactive] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from("members")
      .select("*")
      .eq("id", id)
      .eq("trainer_id", user.uid)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setMember(null);
          setLoading(false);
          return;
        }
        const m = normalizeMember(data as Record<string, unknown>);
        setMember(m);
        setEditStart(m.membership_start);
        setEditEnd(m.membership_end);
        setLoading(false);
      });
  }, [user, id]);

  const handleRenew = async () => {
    if (!member) return;
    setRenewing(true);
    const newStart = new Date();
    const days = BILLING_PERIOD_DAYS[member.billing_period];
    const newEnd = addDays(newStart, days);
    const renewalAmt = renewalAmount(member.membership_plan, member.billing_period);
    const prevRenewals = Number(member.amount_paid ?? 0);
    const newRenewalTotal = prevRenewals + renewalAmt;
    const hadAdmission = Number(member.admission_paid ?? 0) > 0;
    const admissionUpdate =
      member.is_first_membership && !hadAdmission ? { admission_paid: ADMISSION_FEE } : {};

    const { error } = await supabase
      .from("members")
      .update({
        membership_start: format(newStart, "yyyy-MM-dd"),
        membership_end: format(newEnd, "yyyy-MM-dd"),
        status: "active",
        is_first_membership: false,
        is_inactive: false,
        amount_paid: newRenewalTotal,
        ...admissionUpdate,
      })
      .eq("id", member.id);

    if (error) {
      toast.error("Renewal failed: " + error.message);
    } else {
      toast.success("Membership renewed successfully!");
      setMember((m) =>
        m
          ? {
              ...m,
              membership_start: format(newStart, "yyyy-MM-dd"),
              membership_end: format(newEnd, "yyyy-MM-dd"),
              status: "active",
              is_first_membership: false,
              is_inactive: false,
              amount_paid: newRenewalTotal,
              admission_paid: hadAdmission ? m.admission_paid : ADMISSION_FEE,
            }
          : m
      );
      setEditStart(format(newStart, "yyyy-MM-dd"));
      setEditEnd(format(newEnd, "yyyy-MM-dd"));
    }
    setRenewing(false);
  };

  const handleBillingPeriodChange = async (period: BillingPeriod) => {
    if (!member) return;
    const { error } = await supabase
      .from("members")
      .update({ billing_period: period })
      .eq("id", member.id);
    if (error) {
      toast.error("Could not update package: " + error.message);
      return;
    }
    setMember((m) => (m ? { ...m, billing_period: period } : m));
    toast.success("Package updated for next renewal");
  };

  const handleSaveDates = async () => {
    if (!member || !editStart || !editEnd) return;
    setSavingDates(true);
    const { error } = await supabase
      .from("members")
      .update({
        membership_start: editStart,
        membership_end: editEnd,
      })
      .eq("id", member.id);

    if (error) {
      toast.error("Could not update dates: " + error.message);
    } else {
      toast.success("Membership dates updated");
      setMember((m) => (m ? { ...m, membership_start: editStart, membership_end: editEnd } : m));
      setEditingDates(false);
    }
    setSavingDates(false);
  };

  const handleToggleInactive = async (inactive: boolean) => {
    if (!member) return;
    setTogglingInactive(true);
    const { error } = await supabase
      .from("members")
      .update({ is_inactive: inactive })
      .eq("id", member.id);

    if (error) {
      toast.error("Update failed: " + error.message);
    } else {
      toast.success(inactive ? "Marked inactive" : "Marked active");
      setMember((m) => (m ? { ...m, is_inactive: inactive } : m));
    }
    setTogglingInactive(false);
  };

  const handleDelete = async () => {
    if (!member || !confirm(`Delete ${member.name}? This cannot be undone.`)) return;
    setDeleting(true);
    const { error } = await supabase.from("members").delete().eq("id", member.id);
    if (error) {
      toast.error("Delete failed");
    } else {
      toast.success(`${member.name} removed`);
      router.push("/members");
    }
    setDeleting(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (!member) return (
    <DashboardLayout>
      <div className="text-center py-20">
        <p className="text-muted-foreground">Member not found.</p>
        <Link href="/members" className="text-primary hover:underline">← Back to members</Link>
      </div>
    </DashboardLayout>
  );

  const status = getMemberDisplayStatus(member);
  const daysLeft = getDaysLeft(member.membership_end);
  const dateStatus = getMemberDisplayStatus({ ...member, is_inactive: false });
  const showExpiryBanner =
    !member.is_inactive && (dateStatus === "expiring_soon" || dateStatus === "expired");

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/members" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl tracking-widest">MEMBER</h1>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div className="flex justify-center">
            <div className="w-48 h-48 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 overflow-hidden flex items-center justify-center">
              {member.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.photo_url}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 p-4 text-center">
                  <Camera className="w-12 h-12 text-primary/50" />
                  <p className="text-sm text-muted-foreground font-medium">Member Photo</p>
                  <p className="text-xs text-muted-foreground">Not uploaded yet</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">{member.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${statusColor(status)}`}>
                  {status.replace("_", " ")}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium capitalize ${planColor(member.membership_plan)}`}>
                  {PLAN_LABEL[member.membership_plan]} ({member.membership_plan})
                </span>
              </div>
            </div>
            <div className="flex gap-2 self-start sm:self-auto">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-2 rounded-lg bg-muted hover:bg-destructive/20 hover:text-destructive transition-colors"
                title="Delete member"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Inactive / Active */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-display text-sm tracking-widest text-muted-foreground">ATTENDANCE</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Inactive keeps the membership record but marks the person as not currently active.
            </p>
          </div>
          {member.is_inactive ? (
            <button
              type="button"
              disabled={togglingInactive}
              onClick={() => handleToggleInactive(false)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-sm font-medium hover:bg-emerald-500/25"
            >
              <UserCheck className="w-4 h-4" />
              Mark active
            </button>
          ) : (
            <button
              type="button"
              disabled={togglingInactive}
              onClick={() => handleToggleInactive(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted border border-border text-sm font-medium hover:bg-destructive/10 hover:text-destructive"
            >
              <UserX className="w-4 h-4" />
              Mark inactive
            </button>
          )}
        </div>

        {showExpiryBanner && (
          <div className={`flex items-start gap-3 p-4 rounded-xl border ${
            dateStatus === "expired"
              ? "bg-red-400/10 border-red-400/20 text-red-400"
              : "bg-amber-400/10 border-amber-400/20 text-amber-400"
          }`}>
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">
                {dateStatus === "expired"
                  ? "Membership has expired"
                  : `Membership expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
              </p>
              <p className="text-xs mt-0.5 opacity-70">Ends on {formatDate(member.membership_end)}</p>
            </div>
            <button
              onClick={handleRenew}
              disabled={renewing}
              className="flex items-center gap-1.5 text-xs font-medium bg-current/10 hover:bg-current/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${renewing ? "animate-spin" : ""}`} />
              Renew
            </button>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-display text-sm tracking-widest text-muted-foreground">CONTACT</h3>
          <div className="flex items-center gap-3 text-sm">
            <Phone className="w-4 h-4 text-primary flex-shrink-0" />
            <a href={`tel:${member.phone}`} className="text-foreground hover:text-primary">{member.phone}</a>
          </div>
          {member.email && (
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-primary flex-shrink-0" />
              <a href={`mailto:${member.email}`} className="text-foreground hover:text-primary">{member.email}</a>
            </div>
          )}
          {member.emergency_contact && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-muted-foreground">Emergency: {member.emergency_contact}</span>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-sm tracking-widest text-muted-foreground">MEMBERSHIP DATES</h3>
            {!editingDates ? (
              <button
                type="button"
                onClick={() => {
                  setEditStart(member.membership_start);
                  setEditEnd(member.membership_end);
                  setEditingDates(true);
                }}
                className="text-xs inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Pencil className="w-3 h-3" /> Edit dates
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDates(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingDates}
                  onClick={handleSaveDates}
                  className="text-xs inline-flex items-center gap-1 text-primary font-medium"
                >
                  <Save className="w-3 h-3" /> {savingDates ? "Saving…" : "Save"}
                </button>
              </div>
            )}
          </div>

          {editingDates ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-widest">Start</label>
                <input
                  type="date"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="mt-1 w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-widest">End</label>
                <input
                  type="date"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className="mt-1 w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Category", value: PLAN_LABEL[member.membership_plan], icon: Calendar },
                {
                  label: "Package",
                  value: `${BILLING_PERIOD_LABEL[member.billing_period]} · ₹${renewalAmount(member.membership_plan, member.billing_period).toLocaleString()} / renewal`,
                  icon: Calendar,
                },
                { label: "Start Date", value: formatDate(member.membership_start), icon: Calendar },
                { label: "End Date", value: formatDate(member.membership_end), icon: Calendar },
                { label: "Days Left", value: daysLeft < 0 ? "Expired" : `${daysLeft} days`, icon: Bell },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-muted rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
                  <p className="text-sm font-medium text-foreground capitalize">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {member.notes && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-display text-sm tracking-widest text-muted-foreground mb-2">NOTES</h3>
            <p className="text-sm text-foreground leading-relaxed">{member.notes}</p>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-display text-sm tracking-widest text-muted-foreground">PACKAGE FOR RENEWALS</h3>
          <p className="text-xs text-muted-foreground">
            Change the package to match your rate card. Renew button charges this amount for the period length shown.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["monthly", "three_months", "six_months", "yearly"] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => handleBillingPeriodChange(period)}
                className={`p-2 rounded-lg border text-left text-xs ${
                  member.billing_period === period
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-muted hover:border-primary/40"
                }`}
              >
                <div className="font-medium">{BILLING_PERIOD_LABEL[period]}</div>
                <div className="font-mono opacity-80">
                  ₹{renewalAmount(member.membership_plan, period).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {member.is_first_membership ? (
              <>
                On renew: charge <strong className="text-foreground">₹{renewalAmount(member.membership_plan, member.billing_period).toLocaleString()}</strong> for{" "}
                {BILLING_PERIOD_LABEL[member.billing_period]} ({PLAN_LABEL[member.membership_plan]}) — first month was admission only.
              </>
            ) : (
              <>
                Next renew: <strong className="text-foreground">₹{renewalAmount(member.membership_plan, member.billing_period).toLocaleString()}</strong> ·{" "}
                {BILLING_PERIOD_LABEL[member.billing_period]} · {BILLING_PERIOD_DAYS[member.billing_period]} days
              </>
            )}
          </p>
          <button
            onClick={handleRenew}
            disabled={renewing}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${renewing ? "animate-spin" : ""}`} />
            Renew — ₹{renewalAmount(member.membership_plan, member.billing_period).toLocaleString()}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
