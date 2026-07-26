import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";

// Admin-only team management. There is no public signup.
async function requireAdmin() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") {
    return { error: NextResponse.json({ error: "Admins only" }, { status: 403 }) };
  }
  return { user };
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

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

// Edit a team member: name, phone, contact email, role, or reset their password.
export async function PATCH(req: Request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { user_id, full_name, phone, contact_email, role, password } = await req.json();
  if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  if (role && !["agent", "admin"].includes(role)) {
    return NextResponse.json({ error: "Role must be agent or admin." }, { status: 400 });
  }
  if (role === "agent" && user_id === gate.user!.id) {
    return NextResponse.json({ error: "You cannot demote your own account." }, { status: 400 });
  }
  if (password && password.length < 8) {
    return NextResponse.json({ error: "Password needs 8+ characters." }, { status: 400 });
  }

  const admin = supabaseAdmin();

  if (password) {
    const { error } = await admin.auth.admin.updateUserById(user_id, { password });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const updates: Record<string, any> = {};
  if (full_name !== undefined) updates.full_name = full_name;
  if (phone !== undefined) updates.phone = phone;
  if (contact_email !== undefined) updates.contact_email = contact_email;
  if (role !== undefined) updates.role = role;
  if (Object.keys(updates).length) {
    const { error } = await admin.from("profiles").update(updates).eq("id", user_id);
    if (error) return NextResponse.json({ error: "Could not update the profile." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Remove a team member. Their listings transfer to the admin doing the removal.
export async function DELETE(req: Request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { user_id } = await req.json();
  if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  if (user_id === gate.user!.id) {
    return NextResponse.json({ error: "You cannot remove your own account." }, { status: 400 });
  }

  const admin = supabaseAdmin();

  // hand their listings to the removing admin so nothing is orphaned
  await admin.from("listings").update({ created_by: gate.user!.id }).eq("created_by", user_id);
  await admin.from("listings").update({ listing_agent_id: gate.user!.id }).eq("listing_agent_id", user_id);
  // their client share links stay live but no longer point at a person
  await admin.from("listing_shares").update({ created_by: null }).eq("created_by", user_id);

  const { error } = await admin.auth.admin.deleteUser(user_id);
  if (error) {
    console.error("deleteUser failed", error);
    return NextResponse.json({ error: "Could not remove the account: " + error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
