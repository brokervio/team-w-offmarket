import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";

// Admin creates team accounts directly. There is no public signup.
export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const { full_name, email, password, role } = await req.json();
  if (!full_name || !email || !password || password.length < 8) {
    return NextResponse.json({ error: "Name, email, and a password of 8+ characters are required." }, { status: 400 });
  }
  if (!["agent", "admin"].includes(role)) {
    return NextResponse.json({ error: "Role must be agent or admin." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name, phone: "" }
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // the signup trigger creates the profile as a prospect; promote it
  const { error: upErr } = await admin.from("profiles")
    .update({ role, full_name, access_expires_at: null })
    .eq("id", data.user.id);
  if (upErr) {
    console.error("profile promote failed", upErr);
    return NextResponse.json({ error: "Account created but role assignment failed. Contact support." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
