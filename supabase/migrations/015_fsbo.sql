-- 015: flag for-sale-by-owner listings so agents can filter for them.
alter table public.listings
  add column if not exists is_fsbo boolean not null default false;

-- listings already marked as owner / FSBO in the free-text source field
update public.listings
   set is_fsbo = true
 where is_fsbo = false
   and (source ilike '%fsbo%' or source ilike '%by owner%' or lower(trim(source)) = 'owner');

create index if not exists listings_fsbo_idx on public.listings (is_fsbo) where is_fsbo;
