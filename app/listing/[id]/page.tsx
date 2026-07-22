import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabaseServer } from "@/lib/supabase-server";
import { formatPrice, STATUS_LABEL, TYPE_LABEL } from "@/lib/access";
import { BedDouble, Bath, Ruler, MapPin, CalendarDays } from "lucide-react";
import DetailActions from "./DetailActions";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ListingDetail({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { data: l } = await supabase.from("public_listings").select("*").eq("id", params.id).single();
  if (!l) notFound();

  // log the view (RLS: prospect inserts own row)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await supabase.from("view_events").insert({ user_id: user.id, listing_id: l.id });

  // public media only
  const { data: media } = await supabase.from("listing_media")
    .select("id, storage_path, media_type")
    .eq("listing_id", l.id).eq("visibility", "public").order("sort_order");
  const photos: string[] = [];
  for (const m of media ?? []) {
    const { data: s } = await supabase.storage.from("listing-media-public").createSignedUrl(m.storage_path, 3600);
    if (s) photos.push(s.signedUrl);
  }

  const badge = l.status === "coming_soon" ? "badge-teal" : l.status === "available" ? "badge-navy" : "badge-gray";

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6 pb-32">
        {/* GALLERY */}
        <div className="rounded-card overflow-hidden bg-navy-light aspect-[16/9] relative">
          {photos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photos[0]} alt={l.public_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-navy/30 font-bold text-xl">TEAM W | OFF-MARKET</div>
          )}
          <span className={"absolute top-4 left-4 " + badge}>{STATUS_LABEL[l.status]}</span>
        </div>
        {photos.length > 1 && (
          <div className="mt-2 grid grid-cols-4 gap-2">
            {photos.slice(1,5).map((p,i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={p} alt="" className="rounded-lg aspect-[4/3] object-cover" />
            ))}
          </div>
        )}

        {/* HEADLINE */}
        <div className="mt-6">
          <p className="text-xs font-semibold text-teal uppercase tracking-wide">{TYPE_LABEL[l.property_type]}</p>
          <h1 className="text-2xl md:text-3xl mt-1">{l.public_name}</h1>
          <p className="flex items-center gap-1.5 text-slate-500 mt-1">
            <MapPin size={16} /> {l.town}{l.neighborhood_label ? ", " + l.neighborhood_label : ""} (exact address via your agent)
          </p>
          <p className="text-2xl font-extrabold text-navy mt-3">{formatPrice(l)}</p>
        </div>

        {/* SPECS */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {l.beds ? <Spec icon={<BedDouble />} label="Bedrooms" v={String(l.beds)} /> : null}
          {l.baths ? <Spec icon={<Bath />} label="Bathrooms" v={String(l.baths)} /> : null}
          {l.sqft ? <Spec icon={<Ruler />} label="Square feet" v={l.sqft.toLocaleString()} /> : null}
          {l.delivery_date ? <Spec icon={<CalendarDays />} label="Delivery" v={new Date(l.delivery_date).toLocaleDateString("en-US",{month:"short",year:"numeric"})} /> : null}
        </div>

        {/* DESCRIPTION */}
        {l.description_public && (
          <div className="mt-6 card p-5">
            <h2 className="text-lg">About this property</h2>
            <p className="mt-2 text-slate-700 leading-relaxed whitespace-pre-line">{l.description_public}</p>
          </div>
        )}

        {l.lot_desc && (
          <div className="mt-4 card p-5">
            <h2 className="text-lg">Lot</h2>
            <p className="mt-2 text-slate-700">{l.lot_desc}</p>
          </div>
        )}

        <p className="mt-6 text-xs text-slate-400">
          Location shown is approximate to protect the seller. The exact address, plans, and full terms
          are provided by a licensed Team W agent.
        </p>

        {/* STICKY CTAs */}
        <DetailActions listingId={l.id} isNewConstruction={l.property_type === "new_construction"} />
      </main>
      <Footer />
    </>
  );
}

function Spec({ icon, label, v }: { icon: React.ReactNode; label: string; v: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <span className="text-teal">{icon}</span>
      <div><p className="text-xs text-slate-500">{label}</p><p className="font-bold text-navy">{v}</p></div>
    </div>
  );
}
