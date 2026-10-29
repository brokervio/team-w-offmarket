export function daysRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null; // null = never expires
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

export function isActive(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() > Date.now();
}

// Every village and hamlet in Rockland County (towns of Clarkstown,
// Haverstraw, Orangetown, Ramapo and Stony Point), A to Z.
export const ROCKLAND_TOWNS = [
  "Airmont","Bardonia","Blauvelt","Central Nyack","Chestnut Ridge","Congers",
  "Garnerville","Grand View-on-Hudson","Haverstraw","Hillburn","Hillcrest",
  "Jones Point","Kaser","Monsey","Montebello","Mount Ivy","Nanuet","New City",
  "New Hempstead","New Square","Nyack","Orangeburg","Palisades","Pearl River",
  "Piermont","Pomona","Rockland Lake","Sloatsburg","South Nyack","Sparkill",
  "Spring Valley","Stony Point","Suffern","Tallman","Tappan","Thiells",
  "Tomkins Cove","Upper Nyack","Valley Cottage","Viola","Wesley Hills",
  "West Haverstraw","West Nyack"
];

// Places outside Rockland where Team W lists.
export const OUTSIDE_TOWNS = ["Chester","Kiryas Joel","Monroe","Monticello","Other"];

export function townList(): string[] {
  return [...ROCKLAND_TOWNS, ...OUTSIDE_TOWNS];
}

export function formatPrice(l: { price: number | null; price_max: number | null; price_display: string }) {
  const f = (n: number) => "$" + Math.round(n).toLocaleString();
  if (l.price_display === "call" || !l.price) return "Price on request";
  if (l.price_display === "range" && l.price_max) return f(l.price) + " to " + f(l.price_max);
  return f(l.price);
}

// Active = complete listing (address, city/state, beds, baths, description).
// Draft = missing information. See lib/listing-rules.ts.
export const STATUS_LABEL: Record<string,string> = {
  active: "Active",
  draft: "Draft",
  under_contract: "Under Contract",
  sold: "Sold",
  archived: "Archived",
  private_build: "Private Build - Not for Sale"
};

// Statuses a buyer could still purchase (used by buyer-need matching).
export const SELLABLE_STATUSES = ["active", "draft", "under_contract"];

export const STATUS_STYLE: Record<string, string> = {
  active: "bg-teal text-white",
  draft: "bg-amber-100 text-amber-800",
  under_contract: "bg-navy text-white",
  sold: "bg-slate-700 text-white",
  archived: "bg-slate-200 text-slate-600",
  private_build: "bg-rose-100 text-rose-700 border border-rose-300"
};

export const TYPE_LABEL: Record<string,string> = {
  new_construction: "New Construction",
  off_market_resale: "Off-Market Resale",
  multi_family: "Multi-Family",
  land: "Land"
};
