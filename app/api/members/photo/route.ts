import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import { getSupabaseServiceRole } from "@/lib/supabase-server";

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

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const memberId = form.get("memberId") as string | null;
  if (!file || !memberId) {
    return NextResponse.json({ error: "Missing file or memberId" }, { status: 400 });
  }

  const { data: row, error: selErr } = await supabase
    .from("members")
    .select("trainer_id")
    .eq("id", memberId)
    .single();

  if (selErr || !row || row.trainer_id !== uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
  const path = `${uid}/${memberId}.${safeExt}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage.from("member-photos").upload(path, buf, {
    contentType: file.type || `image/${safeExt === "jpg" ? "jpeg" : safeExt}`,
    upsert: true,
  });

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data: pub } = supabase.storage.from("member-photos").getPublicUrl(path);
  const photoUrl = pub.publicUrl;

  const { error: upMem } = await supabase.from("members").update({ photo_url: photoUrl }).eq("id", memberId);
  if (upMem) {
    return NextResponse.json({ error: upMem.message }, { status: 500 });
  }

  return NextResponse.json({ photo_url: photoUrl });
}
