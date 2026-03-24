export type MembershipPlan = "monthly" | "quarterly" | "half-yearly" | "annual";
export type MemberStatus = "active" | "expired" | "expiring_soon" | "paused";
export type PaymentMethod = "cash" | "upi" | "card" | "bank_transfer";

export interface Member {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  photo_url?: string;
  membership_plan: MembershipPlan;
  membership_start: string;
  membership_end: string;
  status: MemberStatus;
  payment_method: PaymentMethod;
  amount_paid: number;
  notes?: string;
  emergency_contact?: string;
  trainer_id: string;
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
        Row: Member;
        Insert: Omit<Member, "id" | "created_at">;
        Update: Partial<Omit<Member, "id" | "created_at">>;
        Relationships: [];
      };
      reminders: {
        Row: Reminder;
        Insert: Omit<Reminder, "id" | "created_at">;
        Update: Partial<Omit<Reminder, "id" | "created_at">>;
        Relationships: [];
      };
      payments: {
        Row: Payment;
        Insert: Omit<Payment, "id" | "created_at">;
        Update: Partial<Omit<Payment, "id" | "created_at">>;
        Relationships: [];
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
