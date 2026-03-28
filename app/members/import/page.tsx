"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/components/layout/AuthProvider";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/firebase";
import { parseWorkbookFirstSheet, normalizePlanValue } from "@/lib/import-xlsx";
import { MEMBER_IMPORT_CHUNK_SIZE } from "@/lib/import-members";
import { ADMISSION_FEE, DEFAULT_MEMBERSHIP_DAYS, addMembershipDays } from "@/lib/membership-config";
import { ArrowLeft, FileSpreadsheet, Upload, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import JSZip from "jszip";
import type { MembershipPlan, Member } from "@/types/supabase";

type InsertMember = Omit<Member, "id" | "created_at">;

type Step = "file" | "map" | "review" | "done";

export default function ImportMembersPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("file");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [colId, setColId] = useState("");
  const [colName, setColName] = useState("");
  const [colPhone, setColPhone] = useState("");
  const [colEmail, setColEmail] = useState("");
  const [colStart, setColStart] = useState("");
  const [colEnd, setColEnd] = useState("");
  const [colPlan, setColPlan] = useState("");
  const [importing, setImporting] = useState(false);
  const [zipImporting, setZipImporting] = useState(false);
  const [importKeyToMemberId, setImportKeyToMemberId] = useState<Map<number, string>>(new Map());

  const previewRows = useMemo(() => rawRows.slice(0, 8), [rawRows]);

  const guessMapping = (h: string[]) => {
    const lower = (s: string) => s.toLowerCase();
    const find = (...candidates: string[]) =>
      h.find((x) => candidates.some((c) => lower(x).includes(c))) ?? "";

    setColId(find("id", "no", "number", "sl"));
    setColName(find("name", "member"));
    setColPhone(find("phone", "mobile", "contact"));
    setColEmail(find("email", "mail"));
    setColStart(find("start", "join", "begin"));
    setColEnd(find("end", "expir", "valid"));
    setColPlan(find("plan", "type", "category"));
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const buf = await f.arrayBuffer();
    try {
      const { headers: h, rows } = parseWorkbookFirstSheet(buf);
      if (!rows.length) {
        toast.error("No rows found in the first sheet.");
        return;
      }
      setHeaders(h.length ? h : Object.keys(rows[0]));
      setRawRows(rows);
      guessMapping(h.length ? h : Object.keys(rows[0]));
      setStep("map");
      toast.success(`Loaded ${rows.length} rows`);
    } catch (err) {
      toast.error("Could not read Excel: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const buildMembersPayload = () => {
    if (!user) return [];
    const rows: InsertMember[] = [];
    /** Sequential 1…n among rows we actually import (skipped rows must not shift ZIP photo indices). */
    let autoImportKey = 0;
    for (let idx = 0; idx < rawRows.length; idx++) {
      const row = rawRows[idx];
      const g = (k: string) => {
        if (!k) return "";
        const v = row[k];
        if (v == null) return "";
        return String(v).trim();
      };

      const idRaw = g(colId);
      const name = g(colName);
      const phone = g(colPhone);
      if (!name || !phone) continue;

      let importKey: number | null = null;
      if (idRaw) {
        const n = parseInt(idRaw, 10);
        if (!isNaN(n)) importKey = n;
      }
      if (importKey == null) {
        autoImportKey += 1;
        importKey = autoImportKey;
      }

      let membershipStart = g(colStart);
      let membershipEnd = g(colEnd);
      const planRaw = g(colPlan);
      const plan: MembershipPlan = planRaw ? normalizePlanValue(planRaw) : "general";

      if (!membershipStart) {
        membershipStart = format(new Date(), "yyyy-MM-dd");
      }
      if (!membershipEnd) {
        const end = addMembershipDays(new Date(membershipStart + "T12:00:00"), DEFAULT_MEMBERSHIP_DAYS);
        membershipEnd = format(end, "yyyy-MM-dd");
      }

      rows.push({
        trainer_id: user.uid,
        name,
        email: g(colEmail) || "",
        phone,
        membership_plan: plan,
        billing_period: "monthly",
        membership_start: membershipStart.slice(0, 10),
        membership_end: membershipEnd.slice(0, 10),
        status: "active" as const,
        payment_method: "upi" as const,
        admission_paid: ADMISSION_FEE,
        amount_paid: 0,
        notes: "",
        emergency_contact: "",
        is_first_membership: true,
        is_inactive: false,
        import_key: importKey,
      });
    }
    return rows;
  };

  const runImport = async () => {
    if (!user) return;
    const members = buildMembersPayload();
    if (members.length === 0) {
      toast.error("No valid rows (need name + phone). Check column mapping.");
      return;
    }
    setImporting(true);
    const token = await auth.currentUser?.getIdToken();
    const map = new Map<number, string>();

    try {
      const apiRes = await fetch("/api/import/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ members }),
      });

      if (apiRes.ok) {
        const j = await apiRes.json();
        const list = j.members as { id: string; import_key: number | null }[];
        for (const m of list) {
          if (m.import_key != null) map.set(m.import_key, m.id);
        }
        toast.success(`Imported ${j.count} members`);
        setImportKeyToMemberId(map);
        setStep("done");
        setImporting(false);
        return;
      }

      if (apiRes.status !== 503 && apiRes.status !== 401) {
        const err = await apiRes.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Import failed");
        setImporting(false);
        return;
      }

      for (let i = 0; i < members.length; i += MEMBER_IMPORT_CHUNK_SIZE) {
        const chunk = members.slice(i, i + MEMBER_IMPORT_CHUNK_SIZE);
        const { data, error } = await supabase.from("members").insert(chunk).select("id, import_key");
        if (error) {
          toast.error("Import failed: " + error.message);
          setImporting(false);
          return;
        }
        if (data) {
          for (const row of data) {
            const r = row as { id: string; import_key: number | null };
            if (r.import_key != null) map.set(r.import_key, r.id);
          }
        }
      }
      toast.success(`Imported ${members.length} members (client)`);
      setImportKeyToMemberId(map);
      setStep("done");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    }
    setImporting(false);
  };

  const onZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || importKeyToMemberId.size === 0) return;
    setZipImporting(true);
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      toast.error("Sign in again to upload photos.");
      setZipImporting(false);
      return;
    }

    try {
      const zip = await JSZip.loadAsync(file);
      let ok = 0;
      let skipped = 0;

      for (const [path, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue;
        const base = path.split("/").pop() ?? path;
        const match = base.match(/^(\d+)\.(jpe?g|png|webp|gif)$/i);
        if (!match) {
          skipped++;
          continue;
        }
        const key = parseInt(match[1], 10);
        const memberId = importKeyToMemberId.get(key);
        if (!memberId) {
          skipped++;
          continue;
        }
        const blob = await entry.async("blob");
        const fd = new FormData();
        fd.append("file", blob, base);
        fd.append("memberId", memberId);

        const res = await fetch("/api/members/photo", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (res.ok) ok++;
        else skipped++;
      }

      toast.success(`Photos uploaded: ${ok}${skipped ? `, skipped ${skipped}` : ""}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ZIP failed");
    }
    setZipImporting(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/members" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display text-3xl tracking-widest">IMPORT MEMBERS</h1>
            <p className="text-muted-foreground text-sm">Excel (.xlsx) then optional ZIP of photos named 1.jpg, 2.jpg…</p>
          </div>
        </div>

        {step === "file" && (
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-12 cursor-pointer hover:border-primary/50 bg-card">
            <FileSpreadsheet className="w-10 h-10 text-primary mb-3" />
            <span className="text-sm font-medium">Drop or click to upload Excel</span>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onPickFile} />
          </label>
        )}

        {(step === "map" || step === "review") && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {rawRows.length} rows · map your columns below. If you map an <code className="text-xs">id</code> column, photos
              use those numbers (1.jpg = id 1). With no id column, photos are numbered 1.jpg, 2.jpg… in import order (rows
              without name/phone are skipped).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  ["ID # (for photos)", colId, setColId] as const,
                  ["Name *", colName, setColName] as const,
                  ["Phone *", colPhone, setColPhone] as const,
                  ["Email", colEmail, setColEmail] as const,
                  ["Start date", colStart, setColStart] as const,
                  ["End date", colEnd, setColEnd] as const,
                  ["Plan (student/general)", colPlan, setColPlan] as const,
                ] as const
              ).map(([label, val, set]) => (
                <div key={label}>
                  <label className="text-xs text-muted-foreground">{label}</label>
                  <select
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    className="mt-1 w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {(headers.length ? headers : Object.keys(rawRows[0] ?? {})).map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    {previewRows[0] &&
                      Object.keys(previewRows[0]).map((k) => (
                        <th key={k} className="p-2 font-medium text-muted-foreground whitespace-nowrap">
                          {k}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      {Object.values(r).map((v, j) => (
                        <td key={j} className="p-2 max-w-[140px] truncate">
                          {String(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep("file")}
                className="px-4 py-2 rounded-lg border border-border text-sm"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep("review")}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <p className="text-sm">
              Ready to import <strong>{buildMembersPayload().length}</strong> members (rows with name + phone).
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep("map")} className="px-4 py-2 rounded-lg border border-border text-sm">
                Back
              </button>
              <button
                type="button"
                disabled={importing}
                onClick={runImport}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Import
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4">
            <p className="text-emerald-400 text-sm font-medium">Import finished.</p>
            <div className="border border-border rounded-xl p-5 bg-card space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ImageIcon className="w-4 h-4" /> Optional: upload ZIP of images
              </div>
              <p className="text-xs text-muted-foreground">
                Name files <code className="text-[10px]">1.jpg</code>, <code className="text-[10px]">2.png</code> matching
                the ID column. Requires server env: <code className="text-[10px]">SUPABASE_SERVICE_ROLE_KEY</code> and{" "}
                <code className="text-[10px]">FIREBASE_SERVICE_ACCOUNT_JSON</code>.
              </p>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted border border-border cursor-pointer text-sm">
                {zipImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {zipImporting ? "Uploading…" : "Choose ZIP"}
                <input type="file" accept=".zip" className="hidden" onChange={onZip} disabled={zipImporting} />
              </label>
            </div>
            <Link href="/members" className="inline-block text-primary text-sm hover:underline">
              ← Back to members
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
