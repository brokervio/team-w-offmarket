"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import BuyerSheet from "./BuyerSheet";
import { BedDouble, Bath, Ruler, Lock, Phone, ImageOff } from "lucide-react";

export type CardListing = {
  id: string; status: string; area: string; price: string;
  beds: number | null; baths: number | null; sqft: number | null;
  delivery: string | null; cover_url: string | null; kind: string;
};

const fmtBeds = (n: number | null) => (n ? `${n}-bed` : "home");

// Widths for the redacted rows, fixed so the page renders the same on server and client.
const BAR_WIDTHS = [62, 48, 71, 55, 66, 44, 58, 69, 51, 64];

export default function PublicSite({ total, listings, buyer, openHome }: {
  total: number;
  listings: CardListing[];
  buyer: { first: string; until: string } | null;
  openHome?: string | null;
}) {
  const [sheet, setSheet] = useState<{ open: boolean; context: string | null; homeId: string | null }>(
    { open: false, context: null, homeId: null });

  useEffect(() => {
    if (!openHome || buyer) return;
    const l = listings.find(x => x.id === openHome);
    setSheet({ open: true, context: l ? `${fmtBeds(l.beds)} in ${l.area}` : null, homeId: l ? l.id : null });
  }, [openHome, buyer, listings]);

  const ask = (l?: CardListing) =>
    setSheet({ open: true, context: l ? `${fmtBeds(l.beds)} in ${l.area}` : null, homeId: l?.id ?? null });

  const hidden = Math.max(0, total - listings.length);
  const shownRows = listings.slice(0, 4);
  const redacted = Math.min(hidden, 8 - shownRows.length);
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-white text-body">
      {/* HEADER */}
      <header className="border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Team W Realty" className="h-9 w-auto" />
          <div className="flex items-center gap-5 text-sm">
            <a href="tel:8454225238" className="hidden sm:inline-flex items-center gap-1.5 font-semibold text-navy hover:text-teal">
              <Phone size={15} /> 845-422-5238
            </a>
            <a href="tel:8454225238" className="sm:hidden p-2 -mr-1 text-navy" aria-label="Call 845-422-5238"><Phone size={18} /></a>
            <Link href="/login" className="text-slate-400 hover:text-navy">Agent login</Link>
          </div>
        </div>
      </header>

      {buyer && (
        <div className="bg-teal-light border-b border-teal/20">
          <p className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 text-sm text-navy-dark">
            You&apos;re in, {buyer.first}. Your access runs through {buyer.until}. Tap any home for the details.
          </p>
        </div>
      )}

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-14 sm:pt-16 sm:pb-20 grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center">
        <div>
          <h1 className="font-display font-extrabold text-navy-dark text-[40px] leading-[1.02] sm:text-[58px] tracking-[-0.025em] max-w-[13ch]">
            Monsey&apos;s new construction, before it&apos;s listed.
          </h1>
          <p className="mt-5 text-lg text-slate-600 max-w-[46ch] leading-relaxed">
            {total} homes are being built or sold privately in Rockland right now. Builders don&apos;t post them
            on Zillow. Team W keeps the list, and verified buyers see it first.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            {buyer ? (
              <a href="#homes" className="btn-primary !px-7 !py-4 text-base">Browse the homes</a>
            ) : (
              <button onClick={() => ask()} className="btn-primary !px-7 !py-4 text-base">Tell us what you&apos;re looking for</button>
            )}
            <a href="#homes" className="btn-secondary !px-7 !py-4 text-base">{buyer ? "Call 845-422-5238" : "See the homes"}</a>
          </div>
        </div>

        {/* THE LIST: the signature element. Public homes in plain text, the rest redacted. */}
        <div className="rounded-[18px] border border-slate-200 bg-[#F6F8FA] p-5 sm:p-6">
          <div className="flex items-baseline justify-between">
            <p className="font-display font-bold text-navy-dark text-lg">The list, {today}</p>
            <p className="text-sm font-semibold text-teal">{total} homes</p>
          </div>
          <ul className="mt-4 divide-y divide-slate-200">
            {shownRows.map(l => (
              <li key={l.id} className="py-3 flex items-center justify-between gap-3 text-[15px]">
                <span className="font-semibold text-navy-dark">{l.beds ? `${l.beds} bed` : l.kind}, {l.area}</span>
                <span className="text-slate-500 shrink-0">{l.price}</span>
              </li>
            ))}
            {Array.from({ length: redacted }).map((_, i) => (
              <li key={"r" + i} className="py-3 flex items-center justify-between gap-3" aria-hidden="true">
                <span className="h-[15px] rounded-[3px] bg-navy-dark/85" style={{ width: `${BAR_WIDTHS[i % BAR_WIDTHS.length]}%` }} />
                <Lock size={14} className="text-slate-400 shrink-0" />
              </li>
            ))}
          </ul>
          {hidden > 0 && (
            <p className="mt-3 text-sm text-slate-500">
              {hidden} {hidden === 1 ? "home is" : "homes are"} shown only to verified buyers, with addresses sent by text.
            </p>
          )}
          {!buyer && (
            <button onClick={() => ask()} className="mt-4 w-full rounded-xl bg-navy-dark text-white font-semibold py-3 hover:bg-navy transition-colors">
              Unlock the list
            </button>
          )}
        </div>
      </section>

      {/* HOMES */}
      <section id="homes" className="bg-[#F6F8FA] border-y border-slate-200 scroll-mt-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <h2 className="font-display font-bold text-navy-dark text-3xl sm:text-4xl tracking-tight">Homes you can look at now</h2>
          <p className="mt-2 text-slate-600 max-w-[60ch]">
            Released with the builder&apos;s or owner&apos;s OK. Addresses go to verified buyers only.
          </p>

          {listings.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map(l => {
                const inner = (
                  <>
                    <div className="relative aspect-[4/3] bg-navy-light overflow-hidden">
                      {l.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.cover_url} alt={`${fmtBeds(l.beds)} in ${l.area}`} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-navy/60">
                          <ImageOff size={26} />
                          <span className="text-sm font-semibold">Photos on request</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-display font-bold text-xl text-navy-dark">{l.price}</p>
                        {l.delivery && <p className="text-xs text-slate-500 shrink-0">Ready {l.delivery}</p>}
                      </div>
                      <p className="mt-0.5 text-slate-600">{l.kind}, {l.area}</p>
                      <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
                        {l.beds != null && <span className="flex items-center gap-1.5"><BedDouble size={16} className="text-teal" /> {l.beds} bd</span>}
                        {l.baths != null && <span className="flex items-center gap-1.5"><Bath size={16} className="text-teal" /> {l.baths} ba</span>}
                        {l.sqft != null && <span className="flex items-center gap-1.5"><Ruler size={16} className="text-teal" /> {l.sqft.toLocaleString()} sf</span>}
                      </div>
                      <p className="mt-4 text-sm font-semibold text-teal flex items-center gap-1.5">
                        {buyer ? "See details" : <><Lock size={13} /> Get the details</>}
                      </p>
                    </div>
                  </>
                );
                const cls = "flex flex-col justify-start w-full p-0 text-left rounded-[14px] bg-white border border-slate-200 overflow-hidden hover:border-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal";
                return buyer
                  ? <Link key={l.id} href={"/homes/" + l.id} className={cls}>{inner}</Link>
                  : <button key={l.id} onClick={() => ask(l)} className={cls}>{inner}</button>;
              })}
            </div>
          ) : (
            <div className="mt-8 rounded-[14px] bg-white border border-slate-200 p-8 max-w-xl">
              <p className="font-display font-bold text-xl text-navy-dark">Builders release homes here as they go up.</p>
              <p className="mt-2 text-slate-600">Tell us what you need and you&apos;ll hear about the ones that fit before anyone else does.</p>
              {!buyer && <button onClick={() => ask()} className="btn-primary mt-5">Tell us what you&apos;re looking for</button>}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS: a real sequence, so it's numbered */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="font-display font-bold text-navy-dark text-3xl sm:text-4xl tracking-tight">How it works</h2>
        <ol className="mt-8 grid sm:grid-cols-3 gap-8">
          {[
            ["Tell us what you need", "Bedrooms, budget, area and timing. Five taps."],
            ["Confirm your cell", "We text you a code once. That keeps the list private."],
            ["Get the homes that fit", "A Team W agent texts you the matches, with addresses, and sets up showings."]
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-4">
              <span className="font-display font-extrabold text-4xl text-teal leading-none">{i + 1}</span>
              <div>
                <p className="font-semibold text-navy-dark text-lg">{t}</p>
                <p className="mt-1 text-slate-600">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* PROOF + CLOSE */}
      <section className="bg-navy-dark text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <p className="font-display font-bold text-3xl sm:text-4xl tracking-tight leading-tight max-w-[28ch]">
              $100M closed. 156 closings. Top 1%.
            </p>
            <p className="mt-3 text-white/70 max-w-[52ch]">
              Builders call Team W first because we bring buyers who are ready. That&apos;s why the list exists.
            </p>
          </div>
          {buyer ? (
            <a href="tel:8454225238" className="btn-primary !px-8 !py-4 text-base">Call 845-422-5238</a>
          ) : (
            <button onClick={() => ask()} className="btn-primary !px-8 !py-4 text-base">Unlock the list</button>
          )}
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-xs text-slate-500 leading-relaxed">
        <p>Team W Realty LLC, Licensed Real Estate Broker. 55 Old Turnpike Rd #408, Nanuet, NY 10954. 845-533-6565.</p>
        <p className="mt-1">Equal Housing Opportunity. Information deemed reliable but not guaranteed. Prices and availability change without notice.</p>
      </footer>

      <BuyerSheet open={sheet.open} context={sheet.context} homeId={sheet.homeId}
                  onClose={() => setSheet(s => ({ ...s, open: false }))} />
    </div>
  );
}
