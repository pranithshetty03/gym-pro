import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import { getSupabaseServiceRole } from "@/lib/supabase-server";
import type { Member } from "@/types/supabase";
import { MEMBER_IMPORT_CHUNK_SIZE } from "@/lib/import-members";

type InsertRow = Omit<Member, "id" | "created_at">;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  const uid = await verifyFirebaseIdToken(token);
  if (!uid) {
    return NextResponse.json(
      { error: "Invalid or unverified token. Set FIREBASE_SERVICE_ACCOUNT_JSON on the server." },
      { status: 401 }
    );
  }

  let supabase;
  try {
    supabase = getSupabaseServiceRole();
  } catch {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  const body = await req.json();
  const members = body?.members as InsertRow[] | undefined;
  if (!Array.isArray(members) || members.length === 0) {
    return NextResponse.json({ error: "Expected members array" }, { status: 400 });
  }

  for (const m of members) {
    if (m.trainer_id !== uid) {
      return NextResponse.json({ error: "trainer_id must match authenticated user" }, { status: 400 });
    }
  }

  const inserted: { id: string; import_key: number | null }[] = [];

  for (let i = 0; i < members.length; i += MEMBER_IMPORT_CHUNK_SIZE) {
    const chunk = members.slice(i, i + MEMBER_IMPORT_CHUNK_SIZE);
    const { data, error } = await supabase.from("members").insert(chunk).select("id, import_key");
    if (error) {
      return NextResponse.json({ error: error.message, partial: inserted.length }, { status: 400 });
    }
    if (data) {
      inserted.push(...(data as { id: string; import_key: number | null }[]));
    }
  }

  return NextResponse.json({ count: inserted.length, members: inserted });
}
