-- ============================================================
-- 013: PUBLIC BUYER SITE
-- Listings stay private unless an agent turns on show_public.
-- Website buyers live in their own tables; only the server
-- (service role) writes them. Staff can read.
-- ============================================================

alter table public.listings
  add column if not exists show_public boolean not null default false;

create table if not exists public.web_buyers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,          -- E.164, +1XXXXXXXXXX
  email text,
  beds_min integer,
  budget_max numeric,
  budget_label text,
  timeline text,
  financing text,
  area text,
  tcpa_consent_at timestamptz,
  tcpa_ip text,
  phone_verified_at timestamptz,
  access_token text unique,
  access_expires_at timestamptz,
  buyer_need_id uuid references public.buyer_needs on delete set null,
  utm jsonb,
  visits integer not null default 1,
  last_seen_at timestamptz default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.web_buyer_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.web_buyers on delete cascade,
  listing_id uuid not null references public.listings on delete cascade,
  created_at timestamptz not null default now(),
  unique (buyer_id, listing_id)
);

alter table public.web_buyers enable row level security;
alter table public.web_buyer_requests enable row level security;

create policy "staff read web buyers" on public.web_buyers
  for select using (public.is_staff());
create policy "staff read web buyer requests" on public.web_buyer_requests
  for select using (public.is_staff());

-- outside-brokerage listings can never be public
alter table public.listings add constraint listings_public_not_outside
  check (not (show_public and is_outside_listing));
