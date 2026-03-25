"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/components/layout/AuthProvider";
import { supabase } from "@/lib/supabase";
import { addDays, addMonths, format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, Save, User, Phone, Mail, CreditCard, Calendar, FileText } from "lucide-react";
import Link from "next/link";

const PLAN_DURATIONS: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  "half-yearly": 180,
  annual: 365,
};

const PLAN_PRICES: Record<string, number> = {
  monthly: 1500,
  quarterly: 4000,
  "half-yearly": 7500,
  annual: 14000,
};

export default function NewMemberPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    membership_plan: "monthly",
    membership_start: today,
    payment_method: "upi",
    amount_paid: PLAN_PRICES.monthly,
    notes: "",
    emergency_contact: "",
  });

  const membershipEnd = format(
    addDays(new Date(form.membership_start), PLAN_DURATIONS[form.membership_plan]),
    "yyyy-MM-dd"
  );

  const update = (key: string, value: string | number) => setForm((f) => ({ ...f, [key]: value }));

  const handlePlanChange = (plan: string) => {
    update("membership_plan", plan);
    update("amount_paid", PLAN_PRICES[plan]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const { error } = await supabase.from("members").insert({
      ...form,
      amount_paid: Number(form.amount_paid),
      membership_end: membershipEnd,
      status: "active",
      trainer_id: user.uid,
    });

    if (error) {
      toast.error("Failed to save member: " + error.message);
    } else {
      toast.success(`${form.name} added successfully!`);
      router.push("/members");
    }
    setSaving(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/members" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl tracking-widest">ADD MEMBER</h1>
            <p className="text-muted-foreground text-sm">Register a new gym member</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Personal Info */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="font-display text-lg tracking-widest flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" /> PERSONAL INFO
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Full Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Phone *</label>
                <input
                  required
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="+91 9876543210"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="john@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Emergency Contact</label>
                <input
                  value={form.emergency_contact}
                  onChange={(e) => update("emergency_contact", e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="+91 9876543210"
                />
              </div>
            </div>
          </div>

          {/* Membership */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="font-display text-lg tracking-widest flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" /> MEMBERSHIP
            </h2>

            {/* Plan selector */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Plan *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(PLAN_PRICES).map(([plan, price]) => (
                  <button
                    type="button"
                    key={plan}
                    onClick={() => handlePlanChange(plan)}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all capitalize ${
                      form.membership_plan === plan
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border bg-muted text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <div>{plan.replace("-", " ")}</div>
                    <div className="text-xs mt-0.5 font-mono">₹{price.toLocaleString()}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Start Date *</label>
                <input
                  type="date"
                  required
                  value={form.membership_start}
                  onChange={(e) => update("membership_start", e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">End Date (auto)</label>
                <input
                  readOnly
                  value={membershipEnd}
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="font-display text-lg tracking-widest flex items-center gap-2 text-muted-foreground">
              <CreditCard className="w-4 h-4" /> PAYMENT
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={form.amount_paid}
                  onChange={(e) => update("amount_paid", e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Payment Method *</label>
                <select
                  value={form.payment_method}
                  onChange={(e) => update("payment_method", e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-display text-lg tracking-widest flex items-center gap-2 text-muted-foreground mb-4">
              <FileText className="w-4 h-4" /> NOTES
            </h2>
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={3}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="Health conditions, goals, trainer notes..."
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 glow-orange"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : "Add Member"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
