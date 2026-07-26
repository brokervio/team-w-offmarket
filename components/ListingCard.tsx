import Link from "next/link";
import { BedDouble, Bath, Ruler, MapPin, Camera } from "lucide-react";
import { formatPrice, STATUS_LABEL, TYPE_LABEL } from "@/lib/access";

// Internal staff view: exact address is shown. This card is only ever
// rendered behind the login wall.
export type ListingRow = {
  id: string; status: string; public_name: string; town: string;
  neighborhood_label?: string | null; exact_address?: string | null;
  price: number | null; price_max: number | null; price_display: string;
  beds: number | null; baths: number | null; sqft: number | null;
  property_type: string; delivery_date?: string | null;
  cover_url?: string | null; photo_count?: number;
};

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800",
  pending: "bg-amber-100 text-amber-800",
  coming_soon: "bg-teal-light text-teal border border-teal",
  available: "bg-teal text-white",
  in_contract: "bg-navy text-white",
  sold: "bg-slate-700 text-white",
  archived: "bg-slate-200 text-slate-600"
};

export default function ListingCard({ l }: { l: ListingRow }) {
  return (
    <Link href={"/listing/" + l.id} className="card group h-full flex flex-col hover:shadow-md transition-shadow">
      <div className="relative aspect-[3/2] bg-slate-100 overflow-hidden">
        {l.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.cover_url} alt={l.exact_address ?? l.public_name}
               className="w-full h-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
            <Camera size={28} />
            <span className="text-xs font-semibold">No photos yet</span>
          </div>
        )}
        <span className={"absolute top-3 left-3 badge " + (STATUS_STYLE[l.status] ?? "badge-gray")}>
          {STATUS_LABEL[l.status] ?? l.status}
        </span>
        {(l.photo_count ?? 0) > 1 && (
          <span className="absolute bottom-3 right-3 badge bg-navy/80 text-white flex items-center gap-1">
            <Camera size={12} /> {l.photo_count}
          </span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col gap-1">
        <p className="text-xl font-extrabold text-navy">{formatPrice(l)}</p>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          {l.beds ? <span className="flex items-center gap-1"><BedDouble size={15}/>{l.beds} bd</span> : null}
          {l.baths ? <span className="flex items-center gap-1"><Bath size={15}/>{l.baths} ba</span> : null}
          {l.sqft ? <span className="flex items-center gap-1"><Ruler size={15}/>{l.sqft.toLocaleString()} sqft</span> : null}
        </div>
        <p className="font-semibold text-navy text-sm leading-snug mt-1 truncate">
          {l.exact_address || l.public_name}
        </p>
        <p className="flex items-center gap-1 text-xs text-slate-500 mt-auto pt-1">
          <MapPin size={12} /> {l.town} <span className="text-slate-300">|</span> {TYPE_LABEL[l.property_type] ?? l.property_type}
        </p>
      </div>
    </Link>
  );
}
