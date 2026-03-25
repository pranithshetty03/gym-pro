"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/components/layout/AuthProvider";
import { supabase } from "@/lib/supabase";
import { getMemberStatus, formatDate, statusColor, planColor, getDaysLeft } from "@/lib/utils";
import { Member } from "@/types/supabase";
import {
  ArrowLeft, Phone, Mail, Calendar, CreditCard, Bell,
  QrCode, Trash2, RefreshCw, AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { addDays, format } from "date-fns";

const PLAN_DURATIONS: Record<string, number> = {
  monthly: 30, quarterly: 90, "half-yearly": 180, annual: 365,
};

export default function MemberDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        setMember(data);
        setLoading(false);
      });
  }, [user, id]);

  const handleRenew = async () => {
    if (!member) return;
    setRenewing(true);
    const newStart = new Date();
    const newEnd = addDays(newStart, PLAN_DURATIONS[member.membership_plan]);
    const { error } = await supabase
      .from("members")
      .update({
        membership_start: format(newStart, "yyyy-MM-dd"),
        membership_end: format(newEnd, "yyyy-MM-dd"),
        status: "active",
      })
      .eq("id", member.id);

    if (error) {
      toast.error("Renewal failed");
    } else {
      toast.success("Membership renewed successfully!");
      setMember((m) => m ? { ...m, membership_end: format(newEnd, "yyyy-MM-dd"), status: "active" } : m);
    }
    setRenewing(false);
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

  const status = getMemberStatus(member.membership_end);
  const daysLeft = getDaysLeft(member.membership_end);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/members" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl tracking-widest">MEMBER</h1>
        </div>

        {/* Profile Card */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center font-display text-3xl text-primary">
              {member.name[0]}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground">{member.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${statusColor(status)}`}>
                  {status.replace("_", " ")}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium capitalize ${planColor(member.membership_plan)}`}>
                  {member.membership_plan} plan
                </span>
              </div>
            </div>
            <div className="flex gap-2 self-start sm:self-auto">
              <Link
                href={`/messages?member=${member.id}`}
                className="p-2 rounded-lg bg-muted hover:bg-primary/20 hover:text-primary transition-colors"
                title="Generate Payment QR"
              >
                <QrCode className="w-4 h-4" />
              </Link>
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

        {/* Expiry Warning */}
        {(status === "expiring_soon" || status === "expired") && (
          <div className={`flex items-start gap-3 p-4 rounded-xl border ${
            status === "expired"
              ? "bg-red-400/10 border-red-400/20 text-red-400"
              : "bg-amber-400/10 border-amber-400/20 text-amber-400"
          }`}>
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">
                {status === "expired"
                  ? "Membership has expired"
                  : `Membership expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
              </p>
              <p className="text-xs mt-0.5 opacity-70">Expired on {formatDate(member.membership_end)}</p>
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

        {/* Contact Info */}
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

        {/* Membership Details */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-display text-sm tracking-widest text-muted-foreground">MEMBERSHIP DETAILS</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Plan", value: member.membership_plan, icon: Calendar },
              { label: "Start Date", value: formatDate(member.membership_start), icon: Calendar },
              { label: "End Date", value: formatDate(member.membership_end), icon: Calendar },
              { label: "Days Left", value: daysLeft < 0 ? "Expired" : `${daysLeft} days`, icon: Bell },
              { label: "Amount Paid", value: `₹${member.amount_paid.toLocaleString()}`, icon: CreditCard },
              { label: "Payment Method", value: member.payment_method.toUpperCase(), icon: CreditCard },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-muted rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
                <p className="text-sm font-medium text-foreground capitalize">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        {member.notes && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-display text-sm tracking-widest text-muted-foreground mb-2">NOTES</h3>
            <p className="text-sm text-foreground leading-relaxed">{member.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleRenew}
            disabled={renewing}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${renewing ? "animate-spin" : ""}`} />
            Renew Membership
          </button>
          <Link
            href={`/messages?member=${member.id}`}
            className="flex-1 flex items-center justify-center gap-2 bg-card border border-border text-foreground py-3 rounded-lg font-medium text-sm hover:bg-muted transition-colors"
          >
            <QrCode className="w-4 h-4" />
            Payment QR
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
