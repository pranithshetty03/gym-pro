"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/components/layout/AuthProvider";
import { supabase } from "@/lib/supabase";
import { format, parseISO, isValid } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, Save, User, Phone, Mail, Calendar, FileText, Camera, CreditCard } from "lucide-react";
import Link from "next/link";
import type { BillingPeriod, MembershipPlan, PaymentMethod } from "@/types/supabase";
import {
  ADMISSION_FEE,
  FIRST_PERIOD_DAYS,
  PACKAGE_PRICES,
  PLAN_LABEL,
  BILLING_PERIOD_LABEL,
  addMembershipDays,
} from "@/lib/membership-config";

const BILLING_PERIODS: BillingPeriod[] = ["monthly", "three_months", "six_months", "yearly"];

type NewMemberFormState = {
  name: string;
  email: string;
  phone: string;
  membership_plan: MembershipPlan;
  billing_period: BillingPeriod;
  membership_start: string;
  payment_method: PaymentMethod;
  notes: string;
  emergency_contact: string;
};

export default function NewMemberPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");
  const [form, setForm] = useState<NewMemberFormState>({
    name: "",
    email: "",
    phone: "",
    membership_plan: "general",
    billing_period: "monthly",
    membership_start: today,
    payment_method: "upi",
    notes: "",
    emergency_contact: "",
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const startDate = (() => {
    const raw = form.membership_start?.trim();
    if (!raw) return new Date();
    const d = parseISO(raw);
    return isValid(d) ? d : new Date();
  })();

  /** First month only: admission ₹1000; end date is start + 30 days. */
  const membershipEnd = format(
    addMembershipDays(startDate, FIRST_PERIOD_DAYS),
    "yyyy-MM-dd"
  );

  const nextRenewalAmount = PACKAGE_PRICES[form.membership_plan][form.billing_period];

  const update = <K extends keyof NewMemberFormState>(key: K, value: NewMemberFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handlePlanChange = (plan: MembershipPlan) => {
    update("membership_plan", plan);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const { error } = await supabase.from("members").insert({
      ...form,
      admission_paid: ADMISSION_FEE,
      amount_paid: 0,
      membership_end: membershipEnd,
      status: "active",
      trainer_id: user.uid,
      is_first_membership: true,
      is_inactive: false,
      import_key: null,
    });

    if (error) {
      toast.error("Failed to save member: " + error.message);
    } else {
      toast.success(`${form.name} added successfully!`);
      router.push("/members");
    }
    setSaving(false);
  };

  const plans: MembershipPlan[] = ["student", "general"];

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-display text-lg tracking-widest flex items-center gap-2 text-muted-foreground mb-4">
            <Camera className="w-4 h-4" /> PROFILE PHOTO
          </h2>
          <div className="flex flex-col items-center">
            <label className="w-40 h-40 border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Preview" className="w-full h-full rounded-lg object-cover" />
              ) : (
                <div className="text-center">
                  <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground font-medium">Click to upload</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
            <p className="text-xs text-muted-foreground mt-2">PNG, JPG up to 5MB</p>
          </div>
        </div>

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

          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="font-display text-lg tracking-widest flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" /> MEMBERSHIP
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Admission ₹{ADMISSION_FEE}</strong> for everyone on signup (first month). Choose
              category and package — after the first month ends, renewals use the package price below.
            </p>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Category *</label>
              <div className="grid grid-cols-2 gap-2">
                {plans.map((plan) => (
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
                    {PLAN_LABEL[plan]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Package (for renewals after first month) *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {BILLING_PERIODS.map((period) => {
                  const price = PACKAGE_PRICES[form.membership_plan][period];
                  return (
                    <button
                      type="button"
                      key={period}
                      onClick={() => update("billing_period", period)}
                      className={`p-3 rounded-lg border text-left text-sm transition-all ${
                        form.billing_period === period
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-border bg-muted text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      <div className="font-medium">{BILLING_PERIOD_LABEL[period]}</div>
                      <div className="text-xs mt-0.5 font-mono">₹{price.toLocaleString()}</div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Next renewal after month 1: <strong className="text-foreground">₹{nextRenewalAmount.toLocaleString()}</strong> (
                {BILLING_PERIOD_LABEL[form.billing_period]} · {PLAN_LABEL[form.membership_plan]})
              </p>
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
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">End Date (first month)</label>
                <input
                  readOnly
                  value={membershipEnd}
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="font-display text-lg tracking-widest flex items-center gap-2 text-muted-foreground">
              <CreditCard className="w-4 h-4" /> PAYMENT
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Amount today (admission)</label>
                <input
                  type="text"
                  readOnly
                  value={`₹${ADMISSION_FEE.toLocaleString()} (fixed)`}
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Payment Method *</label>
                <select
                  value={form.payment_method}
                  onChange={(e) => update("payment_method", e.target.value as PaymentMethod)}
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
            {saving ? "Saving..." : `Add Member — ₹${ADMISSION_FEE} admission`}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
