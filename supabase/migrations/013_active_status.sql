-- 013: new status set.
--   active          complete listing: full address with city + state, beds, baths, description
--   draft           missing information
--   under_contract  (was in_contract)
--   sold, archived, private_build  unchanged
-- available / coming_soon / pending are retired: complete ones become Active,
-- incomplete ones become Draft. Also speeds up row-level security.

-- Safety copy of every listing's status before this change (undo = join back on id).
create table if not exists public.listings_status_backup_013 as
  select id, status, now() as backed_up_at from public.listings;
alter table public.listings_status_backup_013 enable row level security;

create or replace function public.listing_is_complete(
  addr text, beds numeric, baths numeric, descr text)
returns boolean language sql immutable as $$
  -- same pattern as ADDRESS_PATTERN in lib/listing-rules.ts
  select coalesce(addr, '') ~* '^\s*\d+[A-Za-z]?(-\d+)?\s+(\S+[\s,]+){2,}(NY|New York|NJ|New Jersey|PA|Pennsylvania)([\s,.].*)?$'
     and beds is not null
     and baths is not null
     and length(trim(coalesce(descr, ''))) >= 30
$$;

-- address linter runs on update; let it see the new status names first
create or replace function public.check_no_address()
returns trigger language plpgsql as $$
begin
  if new.status in ('active','under_contract') then
    if new.description_public ~* '\d{1,5}\s+\w+\s+(St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Ct|Court|Blvd|Way|Ter|Pl)\M'
       or new.public_name ~ '^\s*\d'
    then
      raise exception 'Public copy appears to contain a street address. Remove it to publish.';
    end if;
  end if;
  return new;
end $$;

alter table public.listings drop constraint listings_status_check;
alter table public.listings disable trigger listings_address_lint;

update public.listings set status = 'under_contract' where status = 'in_contract';
update public.listings
   set status = case when public.listing_is_complete(exact_address, beds, baths, description_public)
                     then 'active' else 'draft' end
 where status in ('available','coming_soon','pending');

alter table public.listings enable trigger listings_address_lint;
alter table public.listings add constraint listings_status_check
  check (status in ('active','draft','under_contract','sold','archived','private_build'));
alter table public.listings alter column status set default 'draft';

-- Active requires the full set of details, enforced by the database too.
create or replace function public.enforce_active_requirements()
returns trigger language plpgsql as $$
begin
  if new.status = 'active'
     and not public.listing_is_complete(new.exact_address, new.beds, new.baths, new.description_public) then
    raise exception 'Active listings need a full address (number, street, city, state), beds, baths and a description. Save it as Draft until those are filled in.';
  end if;
  return new;
end $$;

drop trigger if exists listings_active_requirements on public.listings;
create trigger listings_active_requirements
  before insert or update on public.listings
  for each row execute procedure public.enforce_active_requirements();

-- prospect-safe view: same columns, new status names
create or replace view public.public_listings as
select id, status, public_name, town, neighborhood_label,
       price, price_max, price_display, beds, baths, sqft, lot_desc,
       property_type, delivery_date, description_public,
       public_lat, public_lng, published_at
from public.listings
where status in ('active','under_contract');

-- ---------- RLS SPEED ----------
-- Wrapping the helper in (select ...) makes Postgres check it once per
-- query instead of once per row.
drop policy if exists "staff read listings" on public.listings;
create policy "staff read listings" on public.listings
  for select using ((select public.is_staff()));

drop policy if exists "own or admin updates listings" on public.listings;
create policy "own or admin updates listings" on public.listings
  for update using (
    (select public.current_user_role()) = 'admin'
    or ((select public.is_staff()) and created_by = (select auth.uid())));

drop policy if exists "staff insert own listings" on public.listings;
create policy "staff insert own listings" on public.listings
  for insert with check (
    (select public.is_staff())
    and (created_by = (select auth.uid()) or (select public.current_user_role()) = 'admin'));

drop policy if exists "media read rules" on public.listing_media;
create policy "media read rules" on public.listing_media
  for select using (
    (select public.is_staff())
    or (
      visibility = 'public'
      and (select public.has_active_access())
      and exists (
        select 1 from public.listings l
        where l.id = listing_id and l.status in ('active','under_contract')
      )
    )
  );

drop policy if exists "staff write media" on public.listing_media;
create policy "staff write media" on public.listing_media
  for all using ((select public.is_staff()));

drop policy if exists "staff read builders" on public.builders;
create policy "staff read builders" on public.builders
  for select using ((select public.is_staff()));

drop policy if exists "staff write builders" on public.builders;
create policy "staff write builders" on public.builders
  for all using ((select public.is_staff()));

drop policy if exists "read own profile or staff reads all" on public.profiles;
create policy "read own profile or staff reads all" on public.profiles
  for select using (id = (select auth.uid()) or (select public.is_staff()));

drop policy if exists "admin updates profiles" on public.profiles;
create policy "admin updates profiles" on public.profiles
  for update using ((select public.current_user_role()) = 'admin');

create index if not exists listing_media_listing_idx
  on public.listing_media (listing_id, media_type, sort_order);
create index if not exists listings_status_created_idx
  on public.listings (status, created_at desc);
