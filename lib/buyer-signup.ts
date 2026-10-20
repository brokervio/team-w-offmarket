import { supabaseAdmin } from "@/lib/supabase-server";
import { fireGhl } from "@/lib/ghl";
import { sendSms } from "@/lib/twilio";
import { accessExpiry, matchCount, newToken, prettyPhone, type WebBuyer } from "@/lib/public";

// Runs once the phone is confirmed (or right away if text codes are off).
// Gives 14 days of access, puts the buyer on the agents' Buyers board,
// and tells GHL and the broker.
export async function finalizeBuyer(buyer: WebBuyer, verified: boolean) {
  const admin = supabaseAdmin();
  const token = newToken();
  const returning = !!buyer.access_token;

  const { data: owner } = await admin.from("profiles")
    .select("id, phone").eq("role", "admin").order("created_at").limit(1).single();

  const needFields = {
    client_label: `Website: ${buyer.full_name}, ${prettyPhone(buyer.phone)}`,
    town: buyer.area && buyer.area !== "Anywhere in Rockland" ? buyer.area : "Any",
    property_type: "any",
    min_beds: buyer.beds_min,
    max_price: buyer.budget_max,
    notes: [
      buyer.timeline && `Buying: ${buyer.timeline}`,
      buyer.financing && `Financing: ${buyer.financing}`,
      buyer.email && `Email: ${buyer.email}`,
      verified ? "Phone confirmed by text code." : "Phone not confirmed.",
      "Signed up on the Team W off-market site."
    ].filter(Boolean).join(" | "),
    status: "active"
  };

  let needId = buyer.buyer_need_id;
  if (needId) {
    await admin.from("buyer_needs").update(needFields).eq("id", needId);
  } else if (owner) {
    const { data: need } = await admin.from("buyer_needs")
      .insert({ ...needFields, agent_id: owner.id }).select("id").single();
    needId = need?.id ?? null;
  }

  await admin.from("web_buyers").update({
    access_token: token,
    access_expires_at: accessExpiry(),
    phone_verified_at: verified ? new Date().toISOString() : null,
    buyer_need_id: needId,
    visits: returning ? buyer.visits + 1 : buyer.visits,
    last_seen_at: new Date().toISOString()
  }).eq("id", buyer.id);

  const matches = await matchCount(buyer);

  await fireGhl("signup", {
    name: buyer.full_name, phone: buyer.phone, email: buyer.email,
    beds_min: buyer.beds_min, budget: buyer.budget_label, timeline: buyer.timeline,
    financing: buyer.financing, area: buyer.area, matches, returning,
    phone_verified: verified, tag: "off-market buyer"
  });

  // Internal heads-up to the broker. Never texts the buyer.
  const alertTo = process.env.LEAD_ALERT_PHONE || owner?.phone;
  if (alertTo && process.env.TWILIO_MESSAGING_SERVICE_SID?.startsWith("MG")) {
    const to = "+1" + alertTo.replace(/\D/g, "").slice(-10);
    sendSms(to,
      `${returning ? "Returning" : "New"} off-market buyer: ${buyer.full_name} ${prettyPhone(buyer.phone)}. ` +
      `${buyer.beds_min ?? "?"}+ beds, ${buyer.budget_label ?? "budget n/a"}, ${buyer.timeline ?? ""}, ${buyer.financing ?? ""}. ` +
      `${matches} homes match.`
    ).catch(e => console.error("lead alert sms failed", e));
  }

  return { token, matches };
}
