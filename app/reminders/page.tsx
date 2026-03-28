"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/components/layout/AuthProvider";
import { supabase } from "@/lib/supabase";
import { getMemberStatus, formatDate, getDaysLeft, statusColor, normalizeMember } from "@/lib/utils";
import { Member, Reminder } from "@/types/supabase";
import {
  Bell, CheckCircle2, Clock, Send, AlertTriangle,
  RefreshCw, Plus, X, MessageSquare, Mail,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

function ReminderBadge({ sent }: { sent: boolean }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
      sent
        ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
        : "text-amber-400 bg-amber-400/10 border-amber-400/20"
    }`}>
      {sent ? "Sent" : "Pending"}
    </span>
  );
}

export default function RemindersPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [customChannel, setCustomChannel] = useState<"sms" | "email">("sms");
  const [sending, setSending] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [membersRes, remindersRes] = await Promise.all([
      supabase.from("members").select("*").eq("trainer_id", user.uid),
      supabase
        .from("reminders")
        .select("*, member:members(*)")
        .eq("trainer_id", user.uid)
        .order("scheduled_for", { ascending: false })
        .limit(30),
    ]);
    if (membersRes.data) {
      setMembers(membersRes.data.map((row) => normalizeMember(row as Record<string, unknown>)));
    }
    if (remindersRes.data) setReminders(remindersRes.data as Reminder[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Members expiring soon (≤7 days) or expired
  const urgentMembers = members
    .filter((m) => {
      if (m.is_inactive) return false;
      const s = getMemberStatus(m.membership_end);
      return s === "expiring_soon" || s === "expired";
    })
    .sort((a, b) => getDaysLeft(a.membership_end) - getDaysLeft(b.membership_end));

  const generateReminderMessage = (member: Member) => {
    const days = getDaysLeft(member.membership_end);
    const expired = days < 0;
    return expired
      ? `Hi ${member.name}! 👋 Your GymPro membership expired on ${formatDate(member.membership_end)}. Renew now to continue your fitness journey! 💪 Contact us to renew.`
      : `Hi ${member.name}! 👋 Your GymPro membership expires in *${days} day${days !== 1 ? "s" : ""}* on ${formatDate(member.membership_end)}. Renew now to keep your streak going! 💪`;
  };

  const handleSendSMS = async (member: Member) => {
    if (!user) return;
    setSending(member.id + "-sms");
    const message = generateReminderMessage(member);
    const phone = member.phone.replace(/\D/g, "");

    const { error } = await supabase.from("reminders").insert({
      member_id: member.id,
      type: "expiry",
      message,
      scheduled_for: new Date().toISOString(),
      sent: true,
      sent_at: new Date().toISOString(),
      trainer_id: user.uid,
    });

    if (error) {
      toast.error("Failed to save reminder: " + error.message);
      setSending(null);
      return;
    }

    await fetchData();
    window.location.href = `sms:${phone}?body=${encodeURIComponent(message)}`;
    toast.success("SMS app opened");
    setSending(null);
  };

  const handleSendEmail = async (member: Member) => {
    if (!user) return;
    if (!member.email) {
      toast.error("Member email not available");
      return;
    }

    setSending(member.id + "-email");
    const message = generateReminderMessage(member);
    const subject = "Gym Membership Renewal Reminder";

    const { error } = await supabase.from("reminders").insert({
      member_id: member.id,
      type: "expiry",
      message,
      scheduled_for: new Date().toISOString(),
      sent: true,
      sent_at: new Date().toISOString(),
      trainer_id: user.uid,
    });

    if (error) {
      toast.error("Failed to save reminder: " + error.message);
      setSending(null);
      return;
    }

    await fetchData();
    window.location.href = `mailto:${member.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    toast.success("Email app opened");
    setSending(null);
  };

  const handleCustomReminder = async () => {
    if (!selectedMember || !customMessage.trim() || !user) return;
    if (customChannel === "email" && !selectedMember.email?.trim()) {
      toast.error("Selected member does not have an email");
      return;
    }

    setSending("custom");

    const { error } = await supabase.from("reminders").insert({
      member_id: selectedMember.id,
      type: "custom",
      message: customMessage,
      scheduled_for: new Date().toISOString(),
      sent: true,
      sent_at: new Date().toISOString(),
      trainer_id: user.uid,
    });

    if (error) {
      toast.error("Failed to save reminder: " + error.message);
      setSending(null);
      return;
    }

    const phoneDigits = selectedMember.phone.replace(/\D/g, "");
    const memberEmail = selectedMember.email?.trim() ?? "";
    const messageBody = customMessage;
    const channel = customChannel;

    await fetchData();
    setShowModal(false);
    setCustomMessage("");
    setSelectedMember(null);

    if (channel === "sms") {
      window.location.href = `sms:${phoneDigits}?body=${encodeURIComponent(messageBody)}`;
      toast.success("SMS app opened");
    } else {
      window.location.href = `mailto:${memberEmail}?subject=${encodeURIComponent("Gym Membership Reminder")}&body=${encodeURIComponent(messageBody)}`;
      toast.success("Email app opened");
    }

    setSending(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl tracking-widest">REMINDERS</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {urgentMembers.length} member{urgentMembers.length !== 1 ? "s" : ""} need attention
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Custom Reminder
            </button>
          </div>
        </div>

        {/* Urgent Members */}
        <div className="bg-card border border-border rounded-xl">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="font-display text-xl tracking-widest">URGENT — EXPIRING / EXPIRED</h2>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : urgentMembers.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-foreground font-medium">All memberships are healthy!</p>
              <p className="text-muted-foreground text-sm mt-1">No reminders needed right now.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {urgentMembers.map((member) => {
                const status = getMemberStatus(member.membership_end);
                const days = getDaysLeft(member.membership_end);
                return (
                  <div key={member.id} className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      status === "expired" ? "bg-red-400/20 text-red-400" : "bg-amber-400/20 text-amber-400"
                    }`}>
                      {member.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{member.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${statusColor(status)}`}>
                          {status === "expired" ? "Expired" : `${days}d left`}
                        </span>
                        <span className="text-xs text-muted-foreground">{member.phone}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleSendSMS(member)}
                        disabled={sending === member.id + "-sms"}
                        className="p-2 rounded-lg bg-muted hover:bg-sky-500/20 hover:text-sky-400 transition-colors disabled:opacity-50"
                        title="Send SMS"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleSendEmail(member)}
                        disabled={sending === member.id + "-email"}
                        className="p-2 rounded-lg bg-muted hover:bg-indigo-500/20 hover:text-indigo-400 transition-colors disabled:opacity-50"
                        title="Send Email"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reminder History */}
        <div className="bg-card border border-border rounded-xl">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-display text-xl tracking-widest">REMINDER HISTORY</h2>
          </div>
          {reminders.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No reminders sent yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="flex items-start gap-4 px-5 py-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    reminder.type === "expiry" ? "bg-amber-500/20 text-amber-400" :
                    reminder.type === "payment" ? "bg-violet-500/20 text-violet-400" :
                    "bg-sky-500/20 text-sky-400"
                  }`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-foreground">
                        {(reminder.member as Member)?.name ?? "Unknown"}
                      </p>
                      <ReminderBadge sent={reminder.sent} />
                      <span className="text-[10px] text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded-full">
                        {reminder.type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{reminder.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {reminder.sent_at
                        ? `Sent ${format(new Date(reminder.sent_at), "dd MMM yyyy · hh:mm a")}`
                        : `Scheduled ${formatDate(reminder.scheduled_for)}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Custom Reminder Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl tracking-widest">CUSTOM REMINDER</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Select Member *</label>
                <select
                  value={selectedMember?.id ?? ""}
                  onChange={(e) => {
                    const m = members.find((m) => m.id === e.target.value);
                    setSelectedMember(m ?? null);
                    if (m) setCustomMessage(generateReminderMessage(m));
                  }}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Choose member...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} — {m.phone}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Message *</label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={5}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  placeholder="Type your reminder message..."
                />
                <p className="text-[10px] text-muted-foreground mt-1">{customMessage.length} characters</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Channel *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomChannel("sms")}
                    className={`py-2 rounded-lg border text-sm transition-colors ${
                      customChannel === "sms"
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomChannel("email")}
                    className={`py-2 rounded-lg border text-sm transition-colors ${
                      customChannel === "email"
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    Email
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCustomReminder}
                  disabled={!selectedMember || !customMessage.trim() || sending === "custom"}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {sending === "custom" ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {customChannel === "sms" ? "Send via SMS" : "Send via Email"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
