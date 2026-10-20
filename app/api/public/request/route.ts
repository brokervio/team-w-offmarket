import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getBuyer, getPublicListing } from "@/lib/public";
import { fireGhl } from "@/lib/ghl";

// A signed-up buyer asks for the address and a showing on one home.
export async function POST(req: NextRequest) {
  const buyer = await getBuyer();
  if (!buyer) return NextResponse.json({ error: "Your access expired. Sign up again to continue." }, { status: 401 });
  const { listing_id } = await req.json().catch(() => ({}));
  const found = listing_id ? await getPublicListing(String(listing_id)) : null;
  if (!found) return NextResponse.json({ error: "That home is no longer available." }, { status: 404 });

  await supabaseAdmin().from("web_buyer_requests")
    .upsert({ buyer_id: buyer.id, listing_id: found.listing.id }, { onConflict: "buyer_id,listing_id" });
  await fireGhl("lead", {
    name: buyer.full_name, phone: buyer.phone, email: buyer.email,
    listing_id: found.listing.id, area: found.listing.neighborhood_label || found.listing.town,
    beds: found.listing.beds, lead_type: "details", tag: "off-market buyer"
  });
  return NextResponse.json({ ok: true });
}
