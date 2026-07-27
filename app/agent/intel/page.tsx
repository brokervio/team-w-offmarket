import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabaseServer } from "@/lib/supabase-server";
import IntelForm from "@/components/IntelForm";
import { ReplyBox, PostActions } from "@/components/IntelActions";
import { MapPin, MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

type Reply = { id: string; body: string; created_at: string; author: { full_name: string | null } };
type Post = {
  id: string; location: string; question: string | null; status: string;
  created_at: string; author_id: string; author: { full_name: string | null };
  replies: Reply[];
};

function when(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function IntelBoard() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const isAdmin = me?.role === "admin";

  const { data } = await supabase.from("intel_posts")
    .select("id, location, question, status, created_at, author_id, author:author_id(full_name), replies:intel_replies(id, body, created_at, author:author_id(full_name))")
    .order("created_at", { ascending: false })
    .limit(100);
  const posts = (data ?? []) as unknown as Post[];

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6 min-h-[70vh]">
        <h1 className="text-2xl md:text-3xl">Team Intel</h1>
        <p className="text-sm text-slate-500 mt-1">
          Spotted construction or a quiet deal? Ask the team. Know something? Answer.
        </p>

        <IntelForm currentUserId={user!.id} />

        <div className="mt-6 space-y-4">
          {posts.map(p => {
            const sorted = [...(p.replies ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
            return (
              <div key={p.id} className={"card p-5 " + (p.status === "answered" ? "opacity-70" : "")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-navy flex items-center gap-1.5">
                      <MapPin size={15} className="text-teal shrink-0" /> {p.location}
                      {p.status === "answered" && <span className="badge-gray">answered</span>}
                    </p>
                    {p.question && <p className="text-sm text-slate-600 mt-1">{p.question}</p>}
                    <p className="text-xs text-slate-400 mt-1">
                      {p.author?.full_name ?? "Someone"} | {when(p.created_at)}
                    </p>
                  </div>
                  <PostActions postId={p.id} status={p.status}
                               canManage={isAdmin || p.author_id === user!.id} />
                </div>

                {sorted.length > 0 && (
                  <div className="mt-3 space-y-2 border-l-2 border-teal-light pl-3">
                    {sorted.map(r => (
                      <div key={r.id} className="text-sm">
                        <p className="text-slate-700">{r.body}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {r.author?.full_name ?? "Someone"} | {when(r.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <ReplyBox postId={p.id} currentUserId={user!.id} />
              </div>
            );
          })}
          {!posts.length && (
            <div className="card p-10 text-center">
              <MessageCircle size={28} className="mx-auto text-slate-300" />
              <p className="text-sm text-slate-500 mt-3">Nothing here yet. Spot something on the road? Post it above.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
