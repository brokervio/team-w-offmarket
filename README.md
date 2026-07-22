# Team W Off-Market Portal

Gated off-market and new-construction inventory platform for Team W Realty.
Prospects sign up with a verified phone, get 14 days of access, and any agent
extends them 4 weeks with one tap. Exact addresses and builder data are
protected at the database level with Row Level Security.

## Quick start

1. `cp .env.example .env.local` and fill in every value (see ACTIVATION-GUIDE.md)
2. In Supabase SQL Editor, run `supabase/migrations/001_schema.sql`
3. In Supabase Storage, create buckets `listing-media-public` and `listing-media-internal` (Public toggle OFF on both)
4. `npm install && npm run dev`
5. Sign up through the app with your own phone, then promote yourself in SQL Editor:
   `update public.profiles set role = 'admin', access_expires_at = null where phone = '+1845XXXXXXX';`
6. Deploy: push to GitHub, import in Vercel, paste env vars, add domain.

## Key routes
- `/` landing with blurred teaser grid
- `/signup` phone-verified signup with TCPA consent
- `/browse` filterable inventory (access-gated)
- `/listing/[id]` detail with Request Details / Request Plans
- `/expired` locked state with reactivation
- `/agent` dashboard: expiring prospects, one-tap extend, lead inbox
- `/agent/prospects/[id]` prospect intel with auto call brief
- `/agent/listings` + `/agent/listings/new` listing management with internal/public split
- `/admin` approval queue, extension leaderboard, prospect management

## Security model
Prospects query the `public_listings` VIEW, which physically excludes
exact_address, coordinates, and builder columns. The base `listings` table and
the entire `builders` table are staff-only via RLS. A database trigger blocks
publishing any listing whose public copy contains a street-address pattern.
