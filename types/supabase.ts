export type MembershipPlan = "student" | "general";

/** Package length for renewals (after first admission month). */
export type BillingPeriod = "monthly" | "three_months" | "six_months" | "yearly";

export type MemberStatus = "active" | "expired" | "expiring_soon" | "paused" | "inactive";
export type PaymentMethod = "cash" | "upi" | "card" | "bank_transfer";

export interface Member {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  photo_url?: string;
  membership_plan: MembershipPlan;
  billing_period: BillingPeriod;
  membership_start: string;
  membership_end: string;
  status: MemberStatus;
  payment_method: PaymentMethod;
  /** Cumulative renewals after admission (not including admission_paid). */
  amount_paid: number;
  /** One-time admission fee (typically ₹1000). */
  admission_paid: number;
  notes?: string;
  emergency_contact?: string;
  trainer_id: string;
  is_first_membership: boolean;
  is_inactive: boolean;
  import_key: number | null;
}

export interface Reminder {
  id: string;
  created_at: string;
  member_id: string;
  member?: Member;
  type: "expiry" | "payment" | "custom";
  message: string;
  scheduled_for: string;
  sent: boolean;
  sent_at?: string;
  trainer_id: string;
}

export interface Payment {
  id: string;
  created_at: string;
  member_id: string;
  member?: Member;
  amount: number;
  method: PaymentMethod;
  qr_code_url?: string;
  upi_id?: string;
  note?: string;
  trainer_id: string;
}

export interface Database {
  public: {
    Tables: {
      members: {
        Row: Member & Record<string, unknown>;
        Insert: Omit<Member, "id" | "created_at"> & Record<string, unknown>;
        Update: Partial<Omit<Member, "id" | "created_at">> & Record<string, unknown>;
        Relationships: never[];
      };
      reminders: {
        Row: Reminder & Record<string, unknown>;
        Insert: Omit<Reminder, "id" | "created_at"> & Record<string, unknown>;
        Update: Partial<Omit<Reminder, "id" | "created_at">> & Record<string, unknown>;
        Relationships: never[];
      };
      payments: {
        Row: Payment & Record<string, unknown>;
        Insert: Omit<Payment, "id" | "created_at"> & Record<string, unknown>;
        Update: Partial<Omit<Payment, "id" | "created_at">> & Record<string, unknown>;
        Relationships: never[];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
