import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";
import ProfileForm from "@/components/ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: p } = await supabase.from("profiles")
    .select("full_name, phone, contact_email, avatar_path")
    .eq("id", user!.id).single();

  let avatarUrl: string | null = null;
  if (p?.avatar_path) {
    const admin = supabaseAdmin();
    const { data: av } = await admin.storage.from("listing-media-public")
      .createSignedUrl(p.avatar_path, 3600);
    if (av) avatarUrl = av.signedUrl;
  }

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6 min-h-[70vh]">
        <h1 className="text-2xl md:text-3xl">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          This is what clients see on flyers and shared listing pages.
        </p>
        <ProfileForm initial={{
          full_name: p?.full_name ?? "",
          phone: p?.phone ?? "",
          contact_email: p?.contact_email ?? "",
          avatar_url: avatarUrl
        }} />
      </main>
      <Footer />
    </>
  );
}
