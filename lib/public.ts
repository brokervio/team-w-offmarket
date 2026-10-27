// Server-only helpers for the public buyer site. Everything here runs with
// the service role, so every query selects explicit public-safe columns.
// Never select exact_address, builder, seller, agent or internal fields.
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-server";
import { needMatchesListing, type BuyerNeed } from "@/lib/match";

export const BUYER_COOKIE = "tw_buyer";
const ACCESS_DAYS = Number(process.env.ACCESS_INITIAL_DAYS || 14);
// Only complete (Active) listings are ever shown to the public.
export const ACTIVE = ["active"];
// The headline count and buyer matching include Drafts too: they are real
// inventory, and nothing about them is displayed.
export const INVENTORY = ["active", "draft"];

export type PublicListing = {
  id: string; status: string; town: string; neighborhood_label: string | null;
  price: number | null; price_max: number | null; price_display: string;
  beds: number | null; baths: number | null; sqft: number | null;
  property_type: string; delivery_date: string | null; cover_url?: string | null;
};

const PUBLIC_COLS = "id, status, town, neighborhood_label, price, price_max, price_display, beds, baths, sqft, property_type, delivery_date";

export type WebBuyer = {
  id: string; full_name: string; phone: string; email: string | null;
  beds_min: number | null; budget_max: number | null; budget_label: string | null;
  timeline: string | null; financing: string | null; area: string | null;
  access_token: string | null; access_expires_at: string | null;
  phone_verified_at: string | null; buyer_need_id: string | null; visits: number;
};

export function otpEnabled() {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID ?? "";
  return sid.startsWith("VA") && !sid.toLowerCase().includes("xxxx") && !!process.env.TWILIO_AUTH_TOKEN;
}

export function normalizePhone(raw: string): string | null {
  const d = (raw ?? "").replace(/\D/g, "");
  if (d.length === 10) return "+1" + d;
  if (d.length === 11 && d.startsWith("1")) return "+" + d;
  return null;
}

export function prettyPhone(e164: string) {
  const d = e164.replace(/\D/g, "").slice(-10);
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

export async function getBuyer(): Promise<WebBuyer | null> {
  const token = cookies().get(BUYER_COOKIE)?.value;
  if (!token || token.length < 32) return null;
  const { data } = await supabaseAdmin().from("web_buyers")
    .select("*").eq("access_token", token).maybeSingle();
  if (!data) return null;
  if (data.access_expires_at && new Date(data.access_expires_at).getTime() < Date.now()) return null;
  return data as WebBuyer;
}

export async function getPublicListings(): Promise<PublicListing[]> {
  const admin = supabaseAdmin();
  const { data } = await admin.from("listings")
    .select(PUBLIC_COLS)
    .eq("show_public", true).eq("is_outside_listing", false)
    .in("status", ACTIVE)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as PublicListing[];
  if (!rows.length) return rows;
  const { data: media } = await admin.from("listing_media")
    .select("listing_id, storage_path")
    .in("listing_id", rows.map(r => r.id))
    .eq("media_type", "photo").eq("visibility", "public")
    .order("sort_order");
  const firstPath: Record<string, string> = {};
  for (const m of media ?? []) if (!firstPath[m.listing_id]) firstPath[m.listing_id] = m.storage_path;
  for (const r of rows) {
    const p = firstPath[r.id];
    if (!p) continue;
    const { data: s } = await admin.storage.from("listing-media-public").createSignedUrl(p, 6 * 3600);
    r.cover_url = s?.signedUrl ?? null;
  }
  return rows;
}

export async function getPublicListing(id: string) {
  const admin = supabaseAdmin();
  const { data } = await admin.from("listings")
    .select(PUBLIC_COLS + ", lot_desc, description_public")
    .eq("id", id).eq("show_public", true).eq("is_outside_listing", false)
    .in("status", ACTIVE).maybeSingle();
  if (!data) return null;
  const { data: media } = await admin.from("listing_media")
    .select("storage_path").eq("listing_id", id)
    .eq("media_type", "photo").eq("visibility", "public").order("sort_order");
  const photos: string[] = [];
  for (const m of media ?? []) {
    const { data: s } = await admin.storage.from("listing-media-public").createSignedUrl(m.storage_path, 6 * 3600);
    if (s) photos.push(s.signedUrl);
  }
  return { listing: data as unknown as PublicListing & { lot_desc: string | null; description_public: string | null }, photos };
}

// Counts only. Private listings are never described publicly.
export async function inventoryCount() {
  const { count } = await supabaseAdmin().from("listings")
    .select("id", { count: "exact", head: true }).in("status", INVENTORY);
  return count ?? 0;
}

export function buyerAsNeed(b: Pick<WebBuyer, "beds_min" | "budget_max" | "area">): BuyerNeed {
  return {
    id: "", agent_id: "", client_label: "", notes: null, status: "active", created_at: "",
    town: b.area && b.area !== "Anywhere in Rockland" ? b.area : "Any",
    property_type: "any", min_beds: b.beds_min, max_price: b.budget_max
  };
}

export async function matchCount(b: Pick<WebBuyer, "beds_min" | "budget_max" | "area">) {
  const { data } = await supabaseAdmin().from("listings")
    .select("id, status, town, property_type, beds, price").in("status", INVENTORY);
  const need = buyerAsNeed(b);
  return (data ?? []).filter(l => needMatchesListing(need, l as any)).length;
}

export function newToken() {
  return randomBytes(32).toString("hex");
}

export function accessExpiry() {
  return new Date(Date.now() + ACCESS_DAYS * 86400000).toISOString();
}

export function setBuyerCookie(res: { cookies: { set: Function } }, token: string) {
  res.cookies.set(BUYER_COOKIE, token, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: ACCESS_DAYS * 86400
  });
}
