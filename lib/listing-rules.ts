// Rules for the "Active" status. A listing can only be Active when it has
// everything an agent needs to show it. Anything missing = Draft.
// Keep in sync with public.enforce_active_requirements() in
// supabase/migrations/013_active_status.sql.

export const MIN_DESCRIPTION = 30;

// House number, street, city and state, e.g. "45 Summit Ave, Monticello, NY",
// "41 N Saddle River Rd, Unit 212, Monsey, NY 10952" or
// "29 Skylark Drive, Monsey, New York". Commas optional. State must be
// NY, NJ or PA (abbreviated or spelled out). ZIP and county may follow.
export const ADDRESS_PATTERN =
  "^\\s*\\d+[A-Za-z]?(-\\d+)?\\s+(\\S+[\\s,]+){2,}(NY|New York|NJ|New Jersey|PA|Pennsylvania)([\\s,.].*)?$";
const ADDRESS_RE = new RegExp(ADDRESS_PATTERN, "i");

export function isFullAddress(a: string | null | undefined) {
  return ADDRESS_RE.test(a ?? "");
}

export function activeMissing(f: {
  exact_address?: string | null; beds?: unknown; baths?: unknown; description_public?: string | null;
}): string[] {
  const out: string[] = [];
  const addr = (f.exact_address ?? "").trim();
  if (!addr) out.push("the full address");
  else if (!isFullAddress(addr)) out.push("a full address with house number, street, city and state (e.g. 45 Summit Ave, Monticello, NY)");
  if (f.beds === "" || f.beds === null || f.beds === undefined) out.push("bedrooms");
  if (f.baths === "" || f.baths === null || f.baths === undefined) out.push("bathrooms");
  if ((f.description_public ?? "").trim().length < MIN_DESCRIPTION) out.push(`a description of the house (at least ${MIN_DESCRIPTION} characters)`);
  return out;
}
