import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "@/lib/supabase-server";

export const maxDuration = 60;

const SYSTEM = `You write marketing copy for Team W Realty, a real estate brokerage serving Rockland and Orange County, New York. Write a single listing description of 3 to 5 sentences based only on the facts provided.

Rules:
- Never invent facts that were not provided.
- Never mention a street address, house number, or street name. The location may only be described by town or general area.
- Never use em dashes.
- Plain text only. No headings, no bullet points, no quotation marks around the copy.
- Warm and professional tone, confident but not salesy.
- End with a short sentence inviting the reader to contact Team W Realty for details.`;

// The exact street address is deliberately never sent to the model,
// so it can never leak into the public description.
export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || !["agent", "admin"].includes(me.role)) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "AI is not set up yet. An admin needs to add an Anthropic API key to the site settings." },
      { status: 503 }
    );
  }

  const f = await req.json();
  const facts: string[] = [];
  const add = (label: string, v: unknown) => { if (v !== undefined && v !== null && v !== "") facts.push(`${label}: ${v}`); };
  add("Property type", typeof f.property_type === "string" ? f.property_type.replace(/_/g, " ") : f.property_type);
  add("Town", f.town);
  add("Area", f.neighborhood_label);
  add("Bedrooms", f.beds);
  add("Bathrooms", f.baths);
  add("Square feet", f.sqft);
  add("Lot", f.lot_desc);
  add("Delivery date", f.delivery_date);
  add("Price", f.price ? "$" + Number(f.price).toLocaleString() : null);
  add("Status", typeof f.status === "string" ? f.status.replace(/_/g, " ") : f.status);
  if (facts.length < 2) {
    return NextResponse.json({ error: "Fill in a few property details first (town, beds, type) so the AI has something to work with." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: key });
  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: "user", content: "Write the listing description.\n\n" + facts.join("\n") }]
    });
    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "The AI declined this request. Try adjusting the details." }, { status: 502 });
    }
    const block = response.content.find(b => b.type === "text");
    const text = block && block.type === "text" ? block.text.trim() : "";
    if (!text) return NextResponse.json({ error: "The AI returned an empty response. Try again." }, { status: 502 });
    return NextResponse.json({ description: text });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "The AI key is invalid. An admin needs to check it." }, { status: 502 });
    }
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "AI is busy right now. Try again in a minute." }, { status: 502 });
    }
    console.error("generate-description failed", e);
    return NextResponse.json({ error: "Could not generate a description. Try again." }, { status: 502 });
  }
}
