-- ============================================================
-- TEAM W OFF-MARKET PORTAL : FULL SCHEMA + SECURITY
-- Paste this entire file into Supabase SQL Editor and Run.
-- ============================================================

-- ---------- PROFILES ----------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'prospect' check (role in ('prospect','agent','admin')),
  full_name text,
  phone text,
  phone_verified_at timestamptz,
  tcpa_consent_at timestamptz,
  tcpa_consent_ip text,
  sms_opt_out boolean not null default false,
  access_expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- auto-create profile on signup with 14-day access
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, tcpa_consent_at, access_expires_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'phone',''),
    case when new.raw_user_meta_data->>'tcpa_consent' = 'true' then now() else null end,
    now() + interval '14 days'
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- BUILDERS (ENTIRE TABLE INTERNAL) ----------
create table public.builders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  contact_phone text,
  contact_email text,
  notes text,
  created_at timestamptz default now()
);

-- ---------- LISTINGS ----------
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft'
    check (status in ('draft','pending','coming_soon','available','in_contract','sold','archived')),
  public_name text not null,
  town text not null,
  neighborhood_label text,
  price numeric,
  price_max numeric,
  price_display text not null default 'exact' check (price_display in ('exact','range','call')),
  beds int,
  baths numeric,
  sqft int,
  lot_desc text,
  property_type text not null default 'new_construction'
    check (property_type in ('new_construction','off_market_resale','multi_family','land')),
  delivery_date date,
  description_public text,
  public_lat double precision,
  public_lng double precision,
  -- INTERNAL COLUMNS: never exposed to prospects
  exact_address text,
  exact_lat double precision,
  exact_lng double precision,
  builder_id uuid references public.builders,
  cobroke_terms text,
  notes_internal text,
  source text,
  created_by uuid references public.profiles,
  approved_by uuid references public.profiles,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- MEDIA ----------
create table public.listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings on delete cascade,
  storage_path text not null,
  media_type text not null default 'photo'
    check (media_type in ('photo','rendering','floor_plan','doc')),
  visibility text not null default 'internal' check (visibility in ('public','internal')),
  watermarked boolean not null default false,
  sort_order int not null default 0
);

-- ---------- LEADS ----------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles,
  listing_id uuid references public.listings,
  lead_type text not null
    check (lead_type in ('details_request','plan_request','reactivation','signup')),
  assigned_agent uuid references public.profiles,
  status text not null default 'new'
    check (status in ('new','contacted','qualified','dead','converted')),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- ACCESS EXTENSIONS (audit trail per agent) ----------
create table public.access_extensions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles,
  agent_id uuid not null references public.profiles,
  old_expiry timestamptz,
  new_expiry timestamptz not null,
  created_at timestamptz not null default now()
);

-- ---------- VIEW EVENTS (prospect intel) ----------
create table public.view_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles,
  listing_id uuid not null references public.listings,
  created_at timestamptz not null default now()
);

-- ---------- FAVORITES ----------
create table public.favorites (
  user_id uuid not null references public.profiles,
  listing_id uuid not null references public.listings on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- ---------- HELPER FUNCTIONS ----------
create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.has_active_access()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (access_expires_at is null or access_expires_at > now())
  )
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() in ('agent','admin')
$$;

-- ---------- PROSPECT-SAFE VIEW ----------
-- Prospects query THIS, never the listings table.
-- Internal columns physically absent from the view.
create view public.public_listings as
select id, status, public_name, town, neighborhood_label,
       price, price_max, price_display, beds, baths, sqft, lot_desc,
       property_type, delivery_date, description_public,
       public_lat, public_lng, published_at
from public.listings
where status in ('coming_soon','available','in_contract');

grant select on public.public_listings to authenticated;

-- ---------- EXTEND ACCESS RPC (staff only, writes audit row) ----------
create or replace function public.extend_access(target_user uuid, days int default 28)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  old_exp timestamptz;
  new_exp timestamptz;
begin
  if not public.is_staff() then
    raise exception 'Not authorized';
  end if;
  select access_expires_at into old_exp from public.profiles where id = target_user;
  new_exp := greatest(coalesce(old_exp, now()), now()) + make_interval(days => days);
  update public.profiles set access_expires_at = new_exp where id = target_user;
  insert into public.access_extensions (user_id, agent_id, old_expiry, new_expiry)
  values (target_user, auth.uid(), old_exp, new_exp);
  return new_exp;
end $$;

-- ---------- ROW LEVEL SECURITY ----------
alter table public.profiles enable row level security;
alter table public.builders enable row level security;
alter table public.listings enable row level security;
alter table public.listing_media enable row level security;
alter table public.leads enable row level security;
alter table public.access_extensions enable row level security;
alter table public.view_events enable row level security;
alter table public.favorites enable row level security;

-- profiles
create policy "read own profile or staff reads all" on public.profiles
  for select using (id = auth.uid() or public.is_staff());
create policy "admin updates profiles" on public.profiles
  for update using (public.current_user_role() = 'admin');

-- builders: staff only, no exceptions
create policy "staff read builders" on public.builders
  for select using (public.is_staff());
create policy "staff write builders" on public.builders
  for all using (public.is_staff());

-- listings base table: staff only. Prospects use public_listings view.
create policy "staff read listings" on public.listings
  for select using (public.is_staff());
create policy "staff insert listings" on public.listings
  for insert with check (public.is_staff());
create policy "staff update listings" on public.listings
  for update using (public.is_staff());

-- media: prospects see PUBLIC media of PUBLISHED listings, only with ACTIVE access
create policy "media read rules" on public.listing_media
  for select using (
    public.is_staff()
    or (
      visibility = 'public'
      and public.has_active_access()
      and exists (
        select 1 from public.listings l
        where l.id = listing_id
          and l.status in ('coming_soon','available','in_contract')
      )
    )
  );
create policy "staff write media" on public.listing_media
  for all using (public.is_staff());

-- leads
create policy "prospect creates own lead" on public.leads
  for insert with check (user_id = auth.uid());
create policy "staff read leads" on public.leads
  for select using (public.is_staff());
create policy "staff update leads" on public.leads
  for update using (public.is_staff());

-- extensions: staff read; writes only via extend_access RPC
create policy "staff read extensions" on public.access_extensions
  for select using (public.is_staff());

-- view events
create policy "prospect logs own view" on public.view_events
  for insert with check (user_id = auth.uid());
create policy "staff read views" on public.view_events
  for select using (public.is_staff());

-- favorites
create policy "own favorites" on public.favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "staff read favorites too" on public.favorites
  for select using (public.is_staff());

-- ---------- ADDRESS LINTER ----------
-- Blocks publishing if public copy contains a street address pattern
create or replace function public.check_no_address()
returns trigger language plpgsql as $$
begin
  if new.status in ('coming_soon','available','in_contract') then
    if new.description_public ~* '\d{1,5}\s+\w+\s+(St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Ct|Court|Blvd|Way|Ter|Pl)\M'
       or new.public_name ~ '^\s*\d'
    then
      raise exception 'Public copy appears to contain a street address. Remove it to publish.';
    end if;
  end if;
  return new;
end $$;

create trigger listings_address_lint
  before insert or update on public.listings
  for each row execute procedure public.check_no_address();

-- ---------- SEED DATA ----------
insert into public.builders (name, contact_name, notes)
values ('Point View Developers', 'Office', 'Monticello new construction');

insert into public.listings
  (status, public_name, town, neighborhood_label, price_display,
   beds, baths, sqft, property_type, delivery_date, description_public,
   exact_address, cobroke_terms, source, builder_id, published_at)
select
  'coming_soon',
  'New Construction Two-Family, Summit Ave Area',
  'Monticello',
  'Summit Ave corridor',
  'call',
  3, 2.5, 2200, 'new_construction', '2026-11-01',
  'Brand new two-family construction in a growing Monticello corridor. Three bedrooms per unit, open layouts, quality finishes, and a delivery window before winter. Full plans and exact location are available through a Team W agent.',
  '45 Summit Avenue, Monticello, NY',
  'Co-broke offered',
  'Point View direct',
  id,
  now()
from public.builders where name = 'Point View Developers';

-- ============================================================
-- AFTER RUNNING THIS FILE:
-- 1. Storage > create buckets: listing-media-public, listing-media-internal
--    (both with Public bucket toggle OFF, access via signed URLs)
-- 2. Create your own account through the app signup, then promote it:
--    update public.profiles set role = 'admin', access_expires_at = null
--    where phone = 'YOUR-PHONE';
-- 3. Repeat for each agent with role = 'agent'.
-- ============================================================
