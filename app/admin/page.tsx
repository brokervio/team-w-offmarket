import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";
import CreateTeamForm from "@/components/CreateTeamForm";
import TeamManager, { type TeamRow } from "@/components/TeamManager";

export const dynamic = "force-dynamic";

export default async function AdminPanel() {
  const supabase = supabaseServer();
  const admin = supabaseAdmin();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: staff }, { count: liveCount }, { count: draftCount }, usersRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone, contact_email, role, created_at")
      .in("role", ["agent", "admin"]).order("created_at"),
    supabase.from("listings").select("id", { count: "exact", head: true })
      .in("status", ["coming_soon", "available", "in_contract"]),
    supabase.from("listings").select("id", { count: "exact", head: true })
      .eq("status", "draft"),
    admin.auth.admin.listUsers()
  ]);

  const emailById: Record<string, string> = {};
  for (const u of usersRes.data?.users ?? []) emailById[u.id] = u.email ?? "";

  const team: TeamRow[] = (staff ?? []).map(p => ({
    id: p.id,
    full_name: p.full_name ?? "",
    email: emailById[p.id] ?? "",
    phone: p.phone ?? "",
    contact_email: p.contact_email ?? "",
    role: p.role,
    isMe: p.id === user!.id
  }));

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6 min-h-[70vh]">
        <h1 className="text-2xl md:text-3xl">Admin</h1>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Kpi n={String(liveCount ?? 0)} l="Live Listings" />
          <Kpi n={String(draftCount ?? 0)} l="Drafts" />
          <Kpi n={String(staff?.length ?? 0)} l="Team Members" />
        </div>

        {/* TEAM */}
        <section className="mt-8 card p-5">
          <h2 className="text-lg">Team</h2>
          <p className="text-sm text-slate-500 mt-1">
            Edit details, reset passwords, or remove agents. A removed agent's listings transfer to you.
          </p>
          <TeamManager team={team} />
        </section>

        {/* ADD TEAM MEMBER */}
        <section className="mt-6 card p-5">
          <h2 className="text-lg">Add a Team Member</h2>
          <p className="text-sm text-slate-500 mt-1">
            They sign in at this site with the email and password you set here. There is no public signup.
          </p>
          <CreateTeamForm />
        </section>
      </main>
      <Footer />
    </>
  );
}

function Kpi({ n, l }: { n: string; l: string }) {
  return (
    <div className="card p-4 text-center">
      <p className="text-3xl font-extrabold text-navy">{n}</p>
      <p className="text-xs font-semibold text-slate-500 mt-1">{l}</p>
    </div>
  );
}
