import { formatPrice, TYPE_LABEL } from "@/lib/access";
import type { PublicListing } from "@/lib/public";
import type { CardListing } from "@/components/public/PublicSite";

// Public cards show the area label or town, never the marketing name,
// which can carry a street name.
export function toCard(l: PublicListing): CardListing {
  return {
    id: l.id, status: l.status,
    area: l.neighborhood_label?.trim() || l.town,
    price: formatPrice(l),
    beds: l.beds, baths: l.baths, sqft: l.sqft,
    delivery: l.delivery_date
      ? new Date(l.delivery_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })
      : null,
    cover_url: l.cover_url ?? null,
    kind: TYPE_LABEL[l.property_type] ?? "Home"
  };
}
