-- 004: client share links (client sees one listing, no account needed)
create table if not exists public.listing_shares (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings on delete cascade,
  token text not null unique,
  client_name text,
  created_by uuid references public.profiles,
  created_at timestamptz not null default now(),
  revoked boolean not null default false
);

alter table public.listing_shares enable row level security;

create policy "staff manage shares" on public.listing_shares
  for all using (public.is_staff()) with check (public.is_staff());
