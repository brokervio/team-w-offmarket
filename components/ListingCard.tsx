import Link from "next/link";
import { BedDouble, Bath, Ruler, MapPin } from "lucide-react";
import { formatPrice, STATUS_LABEL, TYPE_LABEL } from "@/lib/access";

export type PublicListing = {
  id: string; status: string; public_name: string; town: string;
  neighborhood_label: string | null; price: number | null; price_max: number | null;
  price_display: string; beds: number | null; baths: number | null; sqft: number | null;
  property_type: string; delivery_date: string | null; cover_url?: string | null;
};

const statusBadge: Record<string,string> = {
  coming_soon: "badge-teal", available: "badge-navy", in_contract: "badge-gray"
};

export default function ListingCard({ l, locked = false }: { l: PublicListing; locked?: boolean }) {
  const inner = (
    <div className="card group h-full flex flex-col">
      <div className="relative aspect-[4/3] bg-navy-light overflow-hidden">
        {l.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.cover_url} alt={l.public_name}
               className={"w-full h-full object-cover transition-transform group-hover:scale-105 " + (locked ? "blur-md scale-110" : "")} />
        ) : (
          <div className={"w-full h-full flex items-center justify-center text-navy/30 font-bold text-lg " + (locked ? "blur-sm" : "")}>
            TEAM W | OFF-MARKET
          </div>
        )}
        <span className={"absolute top-3 left-3 " + (statusBadge[l.status] ?? "badge-gray")}>
          {STATUS_LABEL[l.status] ?? l.status}
        </span>
        {locked && (
          <div className="absolute inset-0 bg-navy/70 flex items-center justify-center">
            <span className="text-white font-bold text-sm px-4 text-center">Create a free account to unlock</span>
          </div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <p className="text-xs font-semibold text-teal uppercase tracking-wide">{TYPE_LABEL[l.property_type]}</p>
        <h3 className="text-base leading-snug">{l.public_name}</h3>
        <p className="flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} /> {l.town}{l.neighborhood_label ? ", " + l.neighborhood_label : ""}</p>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          {l.beds ? <span className="flex items-center gap-1"><BedDouble size={15}/>{l.beds}</span> : null}
          {l.baths ? <span className="flex items-center gap-1"><Bath size={15}/>{l.baths}</span> : null}
          {l.sqft ? <span className="flex items-center gap-1"><Ruler size={15}/>{l.sqft.toLocaleString()} sf</span> : null}
        </div>
        <p className="mt-auto pt-2 font-bold text-navy">{formatPrice(l)}</p>
      </div>
    </div>
  );
  if (locked) return <div>{inner}</div>;
  return <Link href={"/listing/" + l.id}>{inner}</Link>;
}
