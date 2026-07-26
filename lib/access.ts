export function daysRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null; // null = never expires
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

export function isActive(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() > Date.now();
}

export function townList(): string[] {
  return ["Monsey","Spring Valley","Airmont","Suffern","Nanuet","New Hempstead",
          "Pomona","Wesley Hills","New Square","Monroe","Kiryas Joel",
          "Monticello","Chester","Other"];
}

export function formatPrice(l: { price: number | null; price_max: number | null; price_display: string }) {
  const f = (n: number) => "$" + Math.round(n).toLocaleString();
  if (l.price_display === "call" || !l.price) return "Price on request";
  if (l.price_display === "range" && l.price_max) return f(l.price) + " to " + f(l.price_max);
  return f(l.price);
}

export const STATUS_LABEL: Record<string,string> = {
  draft: "Draft",
  pending: "Pending",
  coming_soon: "Coming Soon",
  available: "Available",
  in_contract: "In Contract",
  sold: "Sold",
  archived: "Archived",
  private_build: "Private Build - Not for Sale"
};

export const TYPE_LABEL: Record<string,string> = {
  new_construction: "New Construction",
  off_market_resale: "Off-Market Resale",
  multi_family: "Multi-Family",
  land: "Land"
};
