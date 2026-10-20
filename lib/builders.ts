export type Builder = {
  id: string;
  name: string;
  contact_name?: string | null;
  contact_phone: string | null;
  contact_email?: string | null;
  notes?: string | null;
};

export function phoneDigits(p: string | null | undefined) {
  const d = (p ?? "").replace(/\D/g, "");
  return d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
}

// PostgREST "or" clauses that find a builder's listings: linked by
// builder_id, or older listings where the agent typed the builder's
// phone or name into the seller phone / source fields.
export function builderMatchClauses(b: Builder): string[] {
  const out = [`builder_id.eq.${b.id}`];
  const d = phoneDigits(b.contact_phone);
  if (d.length === 10) out.push(`seller_phone_digits.like.*${d}*`);
  const name = b.name.replace(/\(.*?\)/g, " ").replace(/[,()%*]/g, " ").replace(/\s+/g, " ").trim();
  if (name && !name.includes("@") && name.includes(" ")) {
    out.push(`seller_phone.ilike.*${name}*`, `source.ilike.*${name}*`);
  }
  return out;
}

// Same rules as builderMatchClauses, run in memory (for counts).
export function listingMatchesBuilder(
  l: { builder_id: string | null; seller_phone: string | null; seller_phone_digits?: string | null; source: string | null },
  b: Builder
) {
  if (l.builder_id === b.id) return true;
  const d = phoneDigits(b.contact_phone);
  if (d.length === 10 && (l.seller_phone_digits ?? "").includes(d)) return true;
  const name = b.name.replace(/\(.*?\)/g, " ").replace(/[,()%*]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  if (name && !name.includes("@") && name.includes(" ")) {
    if ((l.seller_phone ?? "").toLowerCase().includes(name) || (l.source ?? "").toLowerCase().includes(name)) return true;
  }
  return false;
}
