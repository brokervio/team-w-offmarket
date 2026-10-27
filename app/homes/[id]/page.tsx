import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getBuyer, getPublicListing } from "@/lib/public";
import { toCard } from "@/lib/public-format";
import RequestDetails from "@/components/public/RequestDetails";
import { ArrowLeft, BedDouble, Bath, Ruler, Trees, CalendarDays, ImageOff } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Off-Market Home | Team W Realty", robots: { index: false } };

export default async function PublicHome({ params }: { params: { id: string } }) {
  const buyer = await getBuyer();
  if (!buyer) redirect("/?home=" + encodeURIComponent(params.id));

  const found = await getPublicListing(params.id);
  if (!found) notFound();
  const { listing: l, photos } = found;
  const c = toCard(l);

  const { data: prior } = await supabaseAdmin().from("web_buyer_requests")
    .select("id").eq("buyer_id", buyer.id).eq("listing_id", l.id).maybeSingle();

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/#homes" className="flex items-center gap-1.5 text-sm font-semibold text-navy hover:text-teal">
            <ArrowLeft size={16} /> All homes
          </Link>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Team W Realty" className="h-9 w-auto" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {photos.length > 0 ? (
          <div className="-mx-4 sm:mx-0 flex gap-3 overflow-x-auto snap-x snap-mandatory sm:rounded-[16px] pb-1">
            {photos.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt={`Photo ${i + 1} of ${photos.length}`}
                   className="snap-center shrink-0 w-[88%] sm:w-[70%] aspect-[4/3] object-cover first:ml-4 sm:first:ml-0 rounded-[12px]" />
            ))}
          </div>
        ) : (
          <div className="aspect-[16/7] rounded-[16px] bg-navy-light flex flex-col items-center justify-center gap-2 text-navy/60">
            <ImageOff size={28} /><span className="font-semibold">Photos on request</span>
          </div>
        )}

        <div className="mt-8 grid lg:grid-cols-[1fr_340px] gap-10">
          <div>
                        <h1 className="font-display font-extrabold text-navy-dark text-[34px] sm:text-[44px] leading-[1.05] tracking-[-0.02em]">{c.price}</h1>
            <p className="mt-1 text-lg text-slate-600">{c.kind}, {c.area}</p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-slate-700">
              {l.beds != null && <span className="flex items-center gap-2"><BedDouble size={18} className="text-teal" /> {l.beds} bedrooms</span>}
              {l.baths != null && <span className="flex items-center gap-2"><Bath size={18} className="text-teal" /> {l.baths} baths</span>}
              {l.sqft != null && <span className="flex items-center gap-2"><Ruler size={18} className="text-teal" /> {l.sqft.toLocaleString()} sq ft</span>}
              {l.lot_desc && <span className="flex items-center gap-2"><Trees size={18} className="text-teal" /> {l.lot_desc}</span>}
              {c.delivery && <span className="flex items-center gap-2"><CalendarDays size={18} className="text-teal" /> Ready {c.delivery}</span>}
            </div>
            {l.description_public && (
              <p className="mt-6 text-slate-700 leading-relaxed whitespace-pre-line max-w-[65ch]">{l.description_public}</p>
            )}
            <p className="mt-8 text-xs text-slate-400">
              Address withheld at the builder&apos;s or owner&apos;s request. Team W Realty LLC, Licensed Real Estate Broker. Equal Housing Opportunity.
            </p>
          </div>
          <aside className="lg:sticky lg:top-6 self-start">
            <RequestDetails listingId={l.id} already={!!prior} />
          </aside>
        </div>
      </main>
    </div>
  );
}
