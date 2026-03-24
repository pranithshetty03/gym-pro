"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/components/layout/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Member, Payment } from "@/types/supabase";
import { formatDate, planColor } from "@/lib/utils";
import QRCode from "qrcode";
import {
  QrCode, Download, Share2, Copy, CheckCheck,
  IndianRupee, RefreshCw, Send, X, History,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const PLAN_PRICES: Record<string, number> = {
  monthly: 1500,
  quarterly: 4000,
  "half-yearly": 7500,
  annual: 14000,
};

function MessagesPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("member");

  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [upiId, setUpiId] = useState("");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [mRes, pRes] = await Promise.all([
      supabase.from("members").select("*").eq("trainer_id", user.uid).order("name"),
      supabase
        .from("payments")
        .select("*, member:members(*)")
        .eq("trainer_id", user.uid)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    if (mRes.data) setMembers(mRes.data as Member[]);
    if (pRes.data) setPayments(pRes.data as Payment[]);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (preselectedId && members.length > 0) {
      const m = members.find((m) => m.id === preselectedId);
      if (m) {
        setSelectedMember(m);
        setAmount(PLAN_PRICES[m.membership_plan] ?? 1500);
        setNote(`${m.membership_plan} membership renewal`);
      }
    }
  }, [preselectedId, members]);

  const generateUPIString = (upi: string, name: string, amt: number, n: string) => {
    return `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(name)}&am=${amt}&cu=INR&tn=${encodeURIComponent(n)}`;
  };

  const handleGenerateQR = async () => {
    if (!upiId.trim()) {
      toast.error("Enter your UPI ID first");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setGenerating(true);
    try {
      const upiString = generateUPIString(
        upiId,
        selectedMember?.name ?? "GymPro Payment",
        amount,
        note || `GymPro membership - ${selectedMember?.name ?? ""}`,
      );
      const dataUrl = await QRCode.toDataURL(upiString, {
        width: 400,
        margin: 2,
        color: { dark: "#0a0a0f", light: "#ffffff" },
        errorCorrectionLevel: "H",
      });
      setQrDataUrl(dataUrl);
      toast.success("QR code generated!");
    } catch {
      toast.error("Failed to generate QR");
    }
    setGenerating(false);
  };

  const handleSavePayment = async () => {
    if (!user || !selectedMember || !qrDataUrl) return;
    setSaving(true);
    const { error } = await supabase.from("payments").insert({
      member_id: selectedMember.id,
      amount,
      method: "upi",
      qr_code_url: qrDataUrl,
      upi_id: upiId,
      note,
      trainer_id: user.uid,
    });
    if (error) {
      toast.error("Failed to save payment record");
    } else {
      toast.success("Payment record saved!");
      await fetchData();
    }
    setSaving(false);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `payment-qr-${selectedMember?.name ?? "gym"}-${Date.now()}.png`;
    a.click();
    toast.success("QR downloaded!");
  };

  const handleShare = async () => {
    if (!qrDataUrl) return;
    try {
      const blob = await (await fetch(qrDataUrl)).blob();
      const file = new File([blob], "payment-qr.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "GymPro Payment QR", text: `Pay ₹${amount} via UPI` });
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    toast.success("UPI ID copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppQR = () => {
    if (!selectedMember || !qrDataUrl) return;
    const msg = `Hi ${selectedMember.name}! 👋 Here's your payment QR code for ₹${amount.toLocaleString()} (${note || "gym membership"}). Please scan to pay via UPI. Thank you! 💪`;
    const phone = selectedMember.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone.startsWith("91") ? phone : "91" + phone}?text=${encodeURIComponent(msg)}`, "_blank");
    toast.info("WhatsApp opened — attach the QR image manually.");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-4xl tracking-widest">PAYMENT QR</h1>
          <p className="text-muted-foreground text-sm mt-1">Generate UPI payment QR codes for memberships</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left — Generator */}
          <div className="space-y-5">
            {/* Member Select */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="font-display text-lg tracking-widest text-muted-foreground flex items-center gap-2">
                <IndianRupee className="w-4 h-4" /> PAYMENT DETAILS
              </h2>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Member (optional)</label>
                <select
                  value={selectedMember?.id ?? ""}
                  onChange={(e) => {
                    const m = members.find((m) => m.id === e.target.value) ?? null;
                    setSelectedMember(m);
                    if (m) {
                      setAmount(PLAN_PRICES[m.membership_plan] ?? 1500);
                      setNote(`${m.membership_plan} membership renewal`);
                      setQrDataUrl(null);
                    }
                  }}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Walk-in / Manual</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} — {m.phone}</option>
                  ))}
                </select>
              </div>

              {selectedMember && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm">
                    {selectedMember.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{selectedMember.name}</p>
                    <p className="text-xs text-muted-foreground">Expires {formatDate(selectedMember.membership_end)}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium capitalize ${planColor(selectedMember.membership_plan)}`}>
                    {selectedMember.membership_plan}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Your UPI ID *</label>
                <div className="flex gap-2">
                  <input
                    value={upiId}
                    onChange={(e) => { setUpiId(e.target.value); setQrDataUrl(null); }}
                    placeholder="yourname@upi or 9876543210@ybl"
                    className="flex-1 bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                  <button
                    onClick={handleCopyUPI}
                    disabled={!upiId}
                    className="p-2.5 rounded-lg bg-muted border border-border hover:bg-primary/20 hover:text-primary transition-colors disabled:opacity-40"
                  >
                    {copied ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Amount (₹) *</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => { setAmount(Number(e.target.value)); setQrDataUrl(null); }}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Quick Amounts</label>
                  <div className="grid grid-cols-2 gap-1">
                    {[1500, 4000, 7500, 14000].map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => { setAmount(a); setQrDataUrl(null); }}
                        className={`text-[10px] py-1.5 rounded border transition-colors font-mono ${
                          amount === a
                            ? "border-primary bg-primary/20 text-primary"
                            : "border-border bg-muted text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        ₹{(a / 1000).toFixed(a % 1000 === 0 ? 0 : 1)}k
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Note / Description</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Monthly membership renewal"
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <button
                onClick={handleGenerateQR}
                disabled={generating || !upiId.trim() || !amount}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 glow-orange"
              >
                {generating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <QrCode className="w-4 h-4" />
                )}
                {generating ? "Generating..." : "Generate QR Code"}
              </button>
            </div>
          </div>

          {/* Right — QR Display */}
          <div className="space-y-5">
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-display text-lg tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                <QrCode className="w-4 h-4" /> QR CODE
              </h2>

              {!qrDataUrl ? (
                <div className="flex flex-col items-center justify-center h-72 bg-muted rounded-xl border-2 border-dashed border-border">
                  <QrCode className="w-12 h-12 text-muted-foreground mb-3 opacity-40" />
                  <p className="text-muted-foreground text-sm">QR code will appear here</p>
                  <p className="text-muted-foreground text-xs mt-1">Fill in details and click Generate</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* QR Card */}
                  <div className="bg-white rounded-2xl p-5 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                        <IndianRupee className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="font-bold text-gray-900 text-sm font-mono">GymPro Pay</span>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt="UPI QR Code" className="w-64 h-64 rounded-xl" />
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">₹{amount.toLocaleString()}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{note || "Gym Membership"}</p>
                      {selectedMember && (
                        <p className="text-gray-400 text-xs mt-0.5">For: {selectedMember.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5">
                      <span className="text-gray-400 text-[10px]">UPI</span>
                      <span className="text-gray-700 text-xs font-mono">{upiId}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDownload}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-muted border border-border text-sm text-foreground hover:bg-muted/80 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={handleShare}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-muted border border-border text-sm text-foreground hover:bg-muted/80 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                    {selectedMember && (
                      <button
                        onClick={handleWhatsAppQR}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        WhatsApp
                      </button>
                    )}
                    <button
                      onClick={handleSavePayment}
                      disabled={saving}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary/20 border border-primary/30 text-primary text-sm hover:bg-primary/30 transition-colors disabled:opacity-50"
                    >
                      {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                      Save Record
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-card border border-border rounded-xl">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <History className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-display text-xl tracking-widest">PAYMENT HISTORY</h2>
          </div>
          {payments.length === 0 ? (
            <div className="py-12 text-center">
              <IndianRupee className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No payment records yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <IndianRupee className="w-5 h-5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {(payment.member as Member)?.name ?? "Walk-in"}
                    </p>
                    <p className="text-xs text-muted-foreground">{payment.note ?? "Membership payment"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground font-mono">₹{payment.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(payment.created_at), "dd MMM yyyy")}
                    </p>
                  </div>
                  {payment.qr_code_url && (
                    <a
                      href={payment.qr_code_url}
                      download={`qr-${payment.id}.png`}
                      className="p-2 rounded-lg bg-muted hover:bg-primary/20 hover:text-primary transition-colors ml-2"
                      title="Download QR"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function MessagesPage() {
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
      <MessagesPageContent />
    </Suspense>
  );
}
