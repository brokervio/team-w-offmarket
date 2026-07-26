// Buyer-need to listing matching. Generous by design: a missing field
// on either side never disqualifies a match.
export type BuyerNeed = {
  id: string; agent_id: string; client_label: string;
  town: string; property_type: string;
  min_beds: number | null; max_price: number | null;
  notes: string | null; status: string; created_at: string;
};

export type MatchableListing = {
  id: string; status: string; town: string; property_type: string;
  beds: number | null; price: number | null;
};

const SELLABLE = ["draft", "coming_soon", "available", "in_contract"];

export function needMatchesListing(need: BuyerNeed, l: MatchableListing): boolean {
  if (!SELLABLE.includes(l.status)) return false;
  if (need.town && need.town !== "Any" && l.town !== need.town) return false;
  if (need.property_type && need.property_type !== "any" && l.property_type !== need.property_type) return false;
  if (need.min_beds && l.beds && l.beds < need.min_beds) return false;
  if (need.max_price && l.price && Number(l.price) > Number(need.max_price)) return false;
  return true;
}
