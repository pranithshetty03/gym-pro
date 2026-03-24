"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/components/layout/AuthProvider";
import { supabase } from "@/lib/supabase";
import { getMemberStatus, formatDate, getDaysLeft, statusColor } from "@/lib/utils";
import { Member, Reminder } from "@/types/supabase";
import {
  Bell, CheckCircle2, Clock, Send, AlertTriangle,
  RefreshCw, Plus, X, Phone, MessageSquare,
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
    if (membersRes.data) setMembers(membersRes.data as Member[]);
    if (remindersRes.data) setReminders(remindersRes.data as Reminder[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Members expiring soon (≤7 days) or expired
  const urgentMembers = members.filter((m) => {
    const s = getMemberStatus(m.membership_end);
    return s === "expiring_soon" || s === "expired";
  }).sort((a, b) => getDaysLeft(a.membership_end) - getDaysLeft(b.membership_end));

  const generateWhatsAppMessage = (member: Member) => {
    const days = getDaysLeft(member.membership_end);
    const expired = days < 0;
    return expired
      ? `Hi ${member.name}! 👋 Your GymPro membership expired on ${formatDate(member.membership_end)}. Renew now to continue your fitness journey! 💪 Contact us to renew.`
      : `Hi ${member.name}! 👋 Your GymPro membership expires in *${days} day${days !== 1 ? "s" : ""}* on ${formatDate(member.membership_end)}. Renew now to keep your streak going! 💪`;
  };

  const handleSendWhatsApp = async (member: Member) => {
    setSending(member.id);
    const message = generateWhatsAppMessage(member);
    const phone = member.phone.replace(/\D/g, "");
    const url = `https://wa.me/${phone.startsWith("91") ? phone : "91" + phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");

    // Log reminder in Supabase
    await supabase.from("reminders").insert({
      member_id: member.id,
      type: "expiry",
      message,
      scheduled_for: new Date().toISOString(),
      sent: true,
      sent_at: new Date().toISOString(),
      trainer_id: user!.uid,
    });

    toast.success(`WhatsApp opened for ${member.name}`);
    await fetchData();
    setSending(null);
  };

  const handleSendSMS = (member: Member) => {
    const message = generateWhatsAppMessage(member);
    const phone = member.phone.replace(/\D/g, "");
    window.location.href = `sms:${phone}?body=${encodeURIComponent(message)}`;
    toast.success("SMS app opened");
  };

  const handleCustomReminder = async () => {
    if (!selectedMember || !customMessage.trim() || !user) return;
    setSending("custom");

    await supabase.from("reminders").insert({
      member_id: selectedMember.id,
      type: "custom",
      message: customMessage,
      scheduled_for: new Date().toISOString(),
      sent: true,
      sent_at: new Date().toISOString(),
      trainer_id: user.uid,
    });

    const phone = selectedMember.phone.replace(/\D/g, "");
    const url = `https://wa.me/${phone.startsWith("91") ? phone : "91" + phone}?text=${encodeURIComponent(customMessage)}`;
    window.open(url, "_blank");

    toast.success("Custom reminder sent!");
    setShowModal(false);
    setCustomMessage("");
    setSelectedMember(null);
    await fetchData();
    setSending(null);
  };

  const handleAutoRemindAll = async () => {
    if (!urgentMembers.length) return;
    toast.info(`Opening WhatsApp for ${urgentMembers.length} members...`);
    for (const member of urgentMembers.slice(0, 3)) {
      await handleSendWhatsApp(member);
      await new Promise((r) => setTimeout(r, 800));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl tracking-widest">REMINDERS</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {urgentMembers.length} member{urgentMembers.length !== 1 ? "s" : ""} need attention
            </p>
          </div>
          <div className="flex gap-2">
            {urgentMembers.length > 0 && (
              <button
                onClick={handleAutoRemindAll}
                className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors"
              >
                <Send className="w-4 h-4" />
                Remind All ({urgentMembers.length})
              </button>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
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
                  <div key={member.id} className="flex items-center gap-4 px-5 py-4">
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSendSMS(member)}
                        className="p-2 rounded-lg bg-muted hover:bg-sky-500/20 hover:text-sky-400 transition-colors"
                        title="Send SMS"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleSendWhatsApp(member)}
                        disabled={sending === member.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-xs font-medium disabled:opacity-50"
                      >
                        {sending === member.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        )}
                        WhatsApp
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
                    if (m) setCustomMessage(generateWhatsAppMessage(m));
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
                  Send via WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
