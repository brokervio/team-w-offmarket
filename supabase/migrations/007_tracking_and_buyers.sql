-- 007: client link tracking + buyer needs board

-- view tracking on share links and collections
alter table public.listing_shares
  add column if not exists view_count int not null default 0,
  add column if not exists last_viewed_at timestamptz;

alter table public.listing_collections
  add column if not exists view_count int not null default 0,
  add column if not exists last_viewed_at timestamptz;

create or replace function public.log_share_view(share_token text)
returns void language sql security definer set search_path = public as $$
  update public.listing_shares
  set view_count = view_count + 1, last_viewed_at = now()
  where token = share_token;
$$;

create or replace function public.log_collection_view(col_token text)
returns void language sql security definer set search_path = public as $$
  update public.listing_collections
  set view_count = view_count + 1, last_viewed_at = now()
  where token = col_token;
$$;

-- buyer needs board
create table if not exists public.buyer_needs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles,
  client_label text not null,
  town text not null default 'Any',
  property_type text not null default 'any',
  min_beds int,
  max_price numeric,
  notes text,
  status text not null default 'active' check (status in ('active','fulfilled','archived')),
  created_at timestamptz not null default now()
);

alter table public.buyer_needs enable row level security;

create policy "staff read needs" on public.buyer_needs
  for select using (public.is_staff());
create policy "staff insert own need" on public.buyer_needs
  for insert with check (public.is_staff() and agent_id = auth.uid());
create policy "own or admin update need" on public.buyer_needs
  for update using (public.current_user_role() = 'admin' or agent_id = auth.uid());
create policy "own or admin delete need" on public.buyer_needs
  for delete using (public.current_user_role() = 'admin' or agent_id = auth.uid());
