import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";
import { formatPrice, STATUS_LABEL, TYPE_LABEL } from "@/lib/access";
import { BedDouble, Bath, Ruler, MapPin, CalendarDays } from "lucide-react";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

// One-page flyer, optimized for print / save-as-PDF.
// ?noaddress=1 hides the exact address (the default from the share card).
export default async function ListingFlyer({ params, searchParams }: {
  params: { id: string }; searchParams: Record<string, string>;
}) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: l } = await supabase.from("listings").select("*").eq("id", params.id).single();
  if (!l) notFound();

  // contact block belongs to whoever is printing the flyer
  const { data: me } = await supabase.from("profiles")
    .select("full_name, phone, contact_email, avatar_path")
    .eq("id", user!.id).single();

  const { data: media } = await supabase.from("listing_media")
    .select("storage_path, visibility")
    .eq("listing_id", params.id).eq("media_type", "photo").eq("visibility", "public")
    .order("sort_order").limit(4);
  const admin = supabaseAdmin();
  const photos: string[] = [];
  for (const m of media ?? []) {
    const { data: signed } = await admin.storage.from("listing-media-public")
      .createSignedUrl(m.storage_path, 3600);
    if (signed) photos.push(signed.signedUrl);
  }
  let avatarUrl: string | null = null;
  if (me?.avatar_path) {
    const { data: av } = await admin.storage.from("listing-media-public")
      .createSignedUrl(me.avatar_path, 3600);
    if (av) avatarUrl = av.signedUrl;
  }

  const hideAddress = searchParams.noaddress === "1";
  const headline = hideAddress || !l.exact_address ? l.public_name : l.exact_address;
  const phone = me?.phone || "845-422-5238";

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-3xl mx-auto px-8 py-8">
        {/* SCREEN-ONLY BAR */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link href={"/listing/" + l.id} className="text-sm text-teal font-semibold">&larr; Back to listing</Link>
          <div className="flex items-center gap-3">
            <Link href={"/listing/" + l.id + "/flyer" + (hideAddress ? "" : "?noaddress=1")}
                  className="text-xs font-semibold text-slate-500 hover:text-navy">
              {hideAddress ? "Show address" : "Hide address"}
            </Link>
            <PrintButton />
          </div>
        </div>

        {/* FLYER HEADER */}
        <div className="flex items-center justify-between border-b-4 border-teal pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Team W Realty" className="h-12 w-auto" />
          <div className="text-right">
            <p className="text-xs font-bold tracking-widest text-teal uppercase">Off-Market Opportunity</p>
            <p className="text-xs text-slate-500">{STATUS_LABEL[l.status] ?? l.status} | {TYPE_LABEL[l.property_type] ?? l.property_type}</p>
          </div>
        </div>

        {/* PHOTOS */}
        {photos.length > 0 && (
          <div className={"mt-5 grid gap-2 rounded-card overflow-hidden " + (photos.length > 1 ? "grid-cols-3" : "grid-cols-1")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[0]} alt="Main photo"
                 className={"w-full object-cover " + (photos.length > 1 ? "col-span-3 max-h-72" : "max-h-80")} />
            {photos.slice(1, 4).map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={p} alt={"Photo " + (i + 2)} className="w-full h-28 object-cover" />
            ))}
          </div>
        )}

        {/* PRICE + ADDRESS */}
        <div className="mt-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-3xl font-extrabold text-navy">{formatPrice(l)}</p>
            <p className="mt-1 text-lg font-semibold text-navy flex items-center gap-1.5">
              <MapPin size={18} className="text-teal" /> {headline}
            </p>
            <p className="text-sm text-slate-500">{l.town}{l.neighborhood_label ? ", " + l.neighborhood_label : ""}</p>
          </div>
        </div>

        {/* FACTS */}
        <div className="mt-4 flex flex-wrap items-center gap-5 text-navy font-semibold border-y border-slate-200 py-3">
          {l.beds ? <span className="flex items-center gap-1.5"><BedDouble size={17} className="text-teal"/>{l.beds} beds</span> : null}
          {l.baths ? <span className="flex items-center gap-1.5"><Bath size={17} className="text-teal"/>{l.baths} baths</span> : null}
          {l.sqft ? <span className="flex items-center gap-1.5"><Ruler size={17} className="text-teal"/>{l.sqft.toLocaleString()} sqft</span> : null}
          {l.lot_desc ? <span className="text-sm font-normal text-slate-600">Lot: {l.lot_desc}</span> : null}
          {l.delivery_date && (
            <span className="flex items-center gap-1.5 text-sm font-normal text-slate-600">
              <CalendarDays size={15}/> Delivery {new Date(l.delivery_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </span>
          )}
        </div>

        {/* DESCRIPTION */}
        {l.description_public && (
          <p className="mt-4 text-slate-700 whitespace-pre-line leading-relaxed text-[15px]">{l.description_public}</p>
        )}

        {/* CONTACT FOOTER */}
        <div className="mt-6 rounded-card bg-navy text-white px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={me?.full_name ?? "Agent"}
                   className="w-14 h-14 rounded-full object-cover border-2 border-teal shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-bold truncate">{me?.full_name ?? "Team W Realty"}</p>
              <p className="text-sm text-slate-200 truncate">Team W Realty LLC | Licensed Real Estate Broker</p>
              {me?.contact_email && <p className="text-sm text-teal-light truncate">{me.contact_email}</p>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-extrabold text-lg">{phone}</p>
            <p className="text-xs text-slate-300">55 Old Turnpike Rd #408, Nanuet, NY</p>
          </div>
        </div>

        <p className="mt-3 text-center text-[10px] text-slate-400">
          Off-market opportunity presented privately. Please do not repost or advertise publicly.
        </p>
      </main>
    </div>
  );
}
