-- 006: client collections (one link that shows several listings)
create table if not exists public.listing_collections (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  title text,
  show_address boolean not null default false,
  created_by uuid references public.profiles,
  created_at timestamptz not null default now(),
  revoked boolean not null default false
);

create table if not exists public.listing_collection_items (
  collection_id uuid not null references public.listing_collections on delete cascade,
  listing_id uuid not null references public.listings on delete cascade,
  sort_order int not null default 0,
  primary key (collection_id, listing_id)
);

alter table public.listing_collections enable row level security;
alter table public.listing_collection_items enable row level security;

create policy "staff manage collections" on public.listing_collections
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage collection items" on public.listing_collection_items
  for all using (public.is_staff()) with check (public.is_staff());
